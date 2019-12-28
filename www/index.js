window.onerror = function(msg, url, line) {
   const idx = url.lastIndexOf('/')
   if (idx > -1) url = url.substring(idx + 1)
   alert('ERROR in ' + url + ' (LINE #' + line + '): ' + msg)
}

///////////////////////////////////////////////////////////
// Que Framework
///////////////////////////////////////////////////////////

new Que({
  data: {
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

  ready() {
    initPlugins()
    mpc.connect('10.0.0.2', 6600, null, err => {
      mpc.error = true
      alert('Connect MPD failed: ' + err)
    })
    this.switchTab(0)
    this._updateStatus()
    this._addBackListener()
  },

  /////////////////////////////////////////////////////////
  // Click events
  /////////////////////////////////////////////////////////

  switchTab(e) {
    const target = e.currentTarget
    this.tabIndex = parseInt(target ? target.dataset.index : e)

    switch (this.tabIndex) {
      case 0: this._getPlaylist(); break
      case 1: this._getFilelist(); break
      default: break
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
    mpc.cmd('update', () => alert('更新成功'))
  },

  clear() {
    confirm('确定清空播放列表吗？', () => {
      mpc.cmd('clear')
      this.playlist = []
    })
  },

  showMenu() {
    this.menuOn = true
  },

  hideMenu() {
    this.menuOn = false
  },

  setSchedule(e) {
    if (this.status.state == 'stop') {
      return alert('播放器已经停止')
    }
  },

  backToTop() {
    document.querySelector('main').scrollTop = 0
  },

  /////////////////////////////////////////////////////////
  // Longpress events
  /////////////////////////////////////////////////////////

  removeTouchStart(e) {
    let pos = e.currentTarget.dataset.pos
    longpress(e.currentTarget, () => {
      confirm('从播放列表移除', () => {
        mpc.cmd('delete ' + pos, () => this._getPlaylist())
      })
    })
  },

  addTouchStart(e) {
    let data = e.currentTarget.dataset
    longpress(e.currentTarget, () => {
      confirm('添加到播放列表', () => {
        mpc.cmd('add ' + (data.dir || data.file))
      })
    })
  },

  stopTouchStart(e) {
    longpress(e.currentTarget, () => mpc.cmd('stop'))
  },

  touchEnd(e) {
    clearTimeout(e.currentTarget.longPressTimer)
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
    setTimeout(() => {
      this._updateStatus()
    }, 1000)
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

///////////////////////////////////////////////////////////
// Init plugins
///////////////////////////////////////////////////////////

function initPlugins() {

  /////////////////////////////////////////////////////////
  // Assign notify plugin to window
  /////////////////////////////////////////////////////////

  Object.assign(window, {
    alert(message) {
      navigator.notification.alert(message, null, '', '关闭')
    },

    confirm(message, callback) {
      navigator.notification.confirm(message, index => {
        if (index == 1) callback()
      }, '', ['确定','取消'])
    },

    longpress(el, fn) {
      el.longPressTimer = setTimeout(() => {
        navigator.vibrate(50); fn()
      }, 500)
    }
  })

  /////////////////////////////////////////////////////////
  // Assign shortcut methods to mpc
  /////////////////////////////////////////////////////////

  Object.assign(window.mpc, {
    cmd(args, callback) {
      if (mpc.error) return
      args = args.replace(/ (.*)$/, ' "$1"')
      const command = args.split(' ')[0]

      mpc.command(args, res => {
        res = mpc.parse(command, res)
        callback && callback(res)
      }, err => {
        mpc.error = true
        alert('Send command failed: ' + err)
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
