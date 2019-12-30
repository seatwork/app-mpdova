window.onerror = function(msg, url, line) {
   const idx = url.lastIndexOf('/')
   if (idx > -1) url = url.substring(idx + 1)
   alert('ERROR in ' + url + ' (LINE #' + line + '): ' + msg)
}

///////////////////////////////////////////////////////////
// Que Framework
///////////////////////////////////////////////////////////

const SERVER_KEY = 'SERVER_KEY'

new Que({
  data: {
    screenWidth: window.innerWidth,
    tabIndex: 0,
    delay: 0,
    countdown: 0,
    status: {},
    currentSong: {},
    playlist: [],
    filelist: [],
    directory: '',
    menuOn: false,
  },

  onDeviceReady() {
    initPlugins()
    this._initMpc()
  },

  _initMpc() {
    this._connectMpd(() => {
      this.switchTab(0)
      this._addStatusListener()
      this._addTimelineListener()
      this._addSwipeListenr()
      this._addBackListener()
    }, () => {
      this._addMpdServer()
    })
  },

  _connectMpd(success, noserver) {
    let server = localStorage.getItem(SERVER_KEY)
    if (server) {
      server = server.split(':')
      mpc.connect(server[0], server[1], () => {
        mpc.error = false
        success && success()
      }, err => {
        mpc.error = true
        mpc.disconnect()
        Toast.alert('Connect failed: ' + err)
      })
    } else {
      noserver && noserver()
    }
  },

  _addMpdServer() {
    navigator.notification.prompt('', res => {
      if (res.buttonIndex == 1) {
        localStorage.setItem(SERVER_KEY, res.input1)
      }
      this._initMpc()
    }, '添加服务器', ['确定'], '10.0.0.2:6600')
  },

  setting() {
    let server = localStorage.getItem(SERVER_KEY)
    navigator.notification.prompt('', res => {
      if (res.buttonIndex == 1) {
        localStorage.setItem(SERVER_KEY, res.input1)
        this._initMpc()
        this.hideMenu()
      }
    }, '服务器设置', ['确定'], server)
  },

  /////////////////////////////////////////////////////////
  // Click events
  /////////////////////////////////////////////////////////

  switchTab(e) {
    const target = e.currentTarget
    this.tabIndex = parseInt(target ? target.dataset.index : e)

    if (this.tabIndex == 0) {
      if (this.playlist.length == 0) this._getPlaylist()
    } else
    if (this.tabIndex == 1) {
      if (this.filelist.length == 0) this._getFilelist()
    }
  },

  openDirectory(e) {
    const dir = e.currentTarget.dataset.dir
    if (dir) {
      this.directory = dir
      this._getFilelist(dir)
    }
  },

  play(e) {
    mpc.cmd('play ' + e.currentTarget.dataset.pos)
  },

  toggle() {
    this.status.state == 'stop' ? mpc.cmd('play') : mpc.cmd('pause')
  },

  next() {
    mpc.cmd('next')
  },

  previous() {
    mpc.cmd('previous')
  },

  repeat() {
    mpc.cmd('repeat ' + Math.pow(0, this.status.repeat))
  },

  single() {
    mpc.cmd('single ' + Math.pow(0, this.status.single))
  },

  random() {
    mpc.cmd('random ' + Math.pow(0, this.status.random))
  },

  update() {
    mpc.cmd('update', () => Toast.alert('更新成功'))
  },

  clear() {
    Toast.confirm('确定清空播放列表吗？', () => {
      mpc.cmd('clear')
      this.playlist = []
    })
  },

  _seek(ratio) {
    mpc.cmd('seekcur ' + Math.round(this.currentSong.Time * ratio))
  },

  showMenu() {
    this.menuOn = true
  },

  hideMenu() {
    this.menuOn = false
  },

  setSchedule(e) {
    if (this.status.state == 'stop') {
      return Toast.alert('播放器已经停止')
    }
    this.delay = parseInt(e.currentTarget.dataset.delay)
    this.countdown = this.delay
  },

  backToTop() {
    const elements = document.querySelectorAll('.song-list')
    elements.forEach(e => e.scrollTop = 0)
  },

  /////////////////////////////////////////////////////////
  // Longpress events
  /////////////////////////////////////////////////////////

  stop(e) {
    navigator.vibrate(50)
    mpc.cmd('stop')
  },

  removeSong(e) {
    navigator.vibrate(50)
    let pos = e.currentTarget.dataset.pos
    Toast.confirm('从播放列表移除', () => {
      mpc.cmd('delete ' + pos, () => this._getPlaylist())
    })
  },

  addSong(e) {
    navigator.vibrate(50)
    let data = e.currentTarget.dataset
    Toast.confirm('添加到播放列表', () => {
      mpc.cmd('add ' + (data.dir || data.file))
    })
  },

  /////////////////////////////////////////////////////////
  // Command execution
  /////////////////////////////////////////////////////////

  _getFilelist(path = '') {
    mpc.cmd('lsinfo ' + path, res => this.filelist = res)
  },

  _getPlaylist() {
    mpc.cmd('playlistinfo', res => this.playlist = res)
  },

  _updateStatus() {
    mpc.cmd('status', res => {
      if (res.time) {
        let progress = res.time.split(':')
        res.progress = parseFloat(progress[0] / progress[1] * 100).toFixed(2)
      }
      if (res.audio) {
        let audio = res.audio.split(':')
        res.samplingRate = audio[0]
        res.bitDepth = audio[1]
        res.channels = audio[2]
      }
      res.progress = res.progress || 0
      this.status = res
    })

    mpc.cmd('currentsong', res => {
      this.currentSong = res
    })
  },

  _addStatusListener() {
    setInterval(() => this._updateStatus(), 1000)
    this._updateStatus()
  },

  /////////////////////////////////////////////////////////
  // Document events
  /////////////////////////////////////////////////////////

  _addBackListener() {
    document.addEventListener('backbutton', () => {
      if (this.menuOn) {
        this.hideMenu()
      } else
      if (this.directory && this.tabIndex === 1) {
        this.directory = this.directory.substr(0, this.directory.lastIndexOf('/'))
        this._getFilelist(this.directory)
      } else {
        navigator.app.exitApp()
      }
    })
  },

  _addTimelineListener() {
    const controls = document.querySelector('.controls')
    const seeker = document.querySelector('.seeker')

    controls.addEventListener('touchstart', e => {
      if (e.target.tagName != 'BUTTON' && this.status.state != 'stop') {
        controls.active = true
      }
    })
    controls.addEventListener('touchmove', e => {
      if (controls.active) {
        controls.x = e.touches[0].clientX
        seeker.style.width = controls.x + 'px'
      }
    })
    controls.addEventListener('touchend', e => {
      if (controls.active) {
        controls.active = false
        seeker.style.width = 0
        this._seek(controls.x / controls.clientWidth)
      }
    })
  },

  _addSwipeListenr() {
    const main = document.querySelector('main')
    const hammer = new Hammer(main)
    hammer.on('swipeleft', () => this.switchTab(1))
    hammer.on('swiperight', () => this.switchTab(0))

    const refresh = new PullRefresh()
    const container = document.querySelector('.song-list')
    refresh.bind(container, () => {
      setTimeout(()=>{
        refresh.hide()
      }, 5000)
    })
  },

  /////////////////////////////////////////////////////////
  // Utils
  /////////////////////////////////////////////////////////

  basename(path) {
    return path ? path.substring(path.lastIndexOf('/') + 1) : ''
  },

  formatDuration(sec) {
    if (isFinite(sec)) {
      let minutes = Math.floor(sec / 60)
      let seconds = Math.floor((sec % 60) % 60)
      seconds = seconds < 10 ? '0' + seconds : seconds
      return minutes + ':' + seconds
    }
    return ''
  }

})

Que.directive('hammer.press', (element, callback) => {
  const hammer = new Hammer(element)
  hammer.on('press', callback)
})

///////////////////////////////////////////////////////////
// Init plugins
///////////////////////////////////////////////////////////

function initPlugins() {

  /////////////////////////////////////////////////////////
  // Assign notify plugin to window
  /////////////////////////////////////////////////////////

  window.Toast = {
    alert(message) {
      navigator.notification.alert(message, null, '', '关闭')
    },

    confirm(message, callback) {
      navigator.notification.confirm(message, index => {
        if (index == 1) callback()
      }, '', ['确定','取消'])
    }
  }

  /////////////////////////////////////////////////////////
  // Assign shortcut methods to mpc
  /////////////////////////////////////////////////////////

  Object.assign(mpc, {
    cmd(args, callback) {
      if (mpc.error) return
      args = args.replace(/ (.*)$/, ' "$1"')
      const command = args.split(' ')[0]

      mpc.command(args, res => {
        res = mpc.parse(command, res)
        callback && callback(res)
      }, err => {
        mpc.error = true
        Toast.alert('Send command failed: ' + err)
      })
    },

    parse(command, data) {
      switch(command) {
        case 'currentsong':
        case 'status': return this.parseStatus(data)
        case 'playlistinfo': return this.parseList(data)
        case 'lsinfo': return this.sort(this.parseList(data))
        default: return data
      }
    },

    parseStatus(res) {
      const result = {}
      res = res.split('\n')

      res.forEach(line => {
        line = line.split(': ')
        result[line[0]] = isFinite(line[1]) ? parseFloat(line[1]) : line[1]
      })
      return result
    },

    parseList(res) {
      const result = []
      let item = null
      res = res.split('\n')

      res.forEach(line => {
        if (line) {
          line = line.split(': ')
          if (line[0] == 'directory' || line[0] == 'file') {
            item = {}
            result.push(item)
          }
          item[line[0]] = line[1]
        }
      })
      return result
    },

    sort(res) {
      return res.sort((a, b) => {
        if (a.directory && !b.directory) {
          return -1
        }
        let x = a.directory || a.file
        let y = b.directory || b.file
        return x.localeCompare(y, 'zh')
      })
    }
  })

}
