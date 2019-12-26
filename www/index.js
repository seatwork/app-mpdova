Que.MPD_ERROR = false

document.addEventListener('deviceready', () => {

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
    },
  })

  if (Que.MPD_ERROR) {
    alert(Que.MPD_ERROR)
  }
})

new Que({
  data: {
    tabIndex: 0,
    delay: 0,
    countdown: 0,
    status: {},
    currentSong: {},
    playlist: [],
    filelist: [],
    menuOn: false,
  },

  ready() {
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
      this._directory = dir
      this._getFilelist(dir)
    }
  },

  play(e) {
    this._exec('play/' + e.currentTarget.dataset.pos)
  },

  toggle() {
    this.status.state == 'stop' ? this._exec('play') : this._exec('pause')
  },

  next() {
    this._exec('next')
  },

  previous() {
    this._exec('previous')
  },

  repeat() {
    this._exec('repeat/' + Math.pow(0, this.status.repeat))
  },

  single() {
    this._exec('single/' + Math.pow(0, this.status.single))
  },

  random() {
    this._exec('random/' + Math.pow(0, this.status.random))
  },

  update() {
    this._exec('update', () => alert('更新成功'))
  },

  clear() {
    confirm('确定清空播放列表吗？', () => {
      this._exec('clear')
      this.playlist = []
    })
  },

  showMenu() {
    this.menuOn = true
    this._startCountdown()
  },

  hideMenu() {
    this.menuOn = false
    this._stopCountdown()
  },

  setSchedule(e) {
    if (this.status.state == 'stop') {
      return alert('播放器已经停止')
    }
    this.delay = this.countdown = parseInt(e.currentTarget.dataset.delay)
    this._exec('schedule/' + this.delay, () => this._startCountdown())
  },

  backToTop() {
    document.querySelector('main').scrollTop = 0
  },

  /////////////////////////////////////////////////////////
  // Countdown timer
  /////////////////////////////////////////////////////////

  _startCountdown() {
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer)
    }

    const loop = () => {
      this._exec('schedule', res => {
        this.delay = res.delay
        this.countdown = res.countdown
        if (this.countdown == 0) {
          this._stopCountdown()
        }
      })
    }

    loop()
    this._countdownTimer = setInterval(loop, 1000)
  },

  _stopCountdown() {
    this.delay = this.countdown = 0
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer)
    }
  },

  /////////////////////////////////////////////////////////
  // Longpress events
  /////////////////////////////////////////////////////////

  removeTouchStart(e) {
    let pos = e.currentTarget.dataset.pos
    longpress(e.currentTarget, () => {
      confirm('从播放列表移除', () => {
        this._exec('delete/' + pos, () => this._getPlaylist())
      })
    })
  },

  addTouchStart(e) {
    let data = e.currentTarget.dataset
    longpress(e.currentTarget, () => {
      confirm('添加到播放列表', () => {
        this._exec('add/' + (data.dir || data.file))
      })
    })
  },

  stopTouchStart(e) {
    longpress(e.currentTarget, () => {
      this._exec('stop')
      this._exec('schedule/0')
    })
  },

  touchEnd(e) {
    clearTimeout(e.currentTarget.longPressTimer)
  },

  /////////////////////////////////////////////////////////
  // Common execute
  /////////////////////////////////////////////////////////

  _getFilelist(path = '') {
    this._exec('lsinfo/' + path, res => this.filelist = res)
  },

  _getPlaylist() {
    this._exec('playlistinfo', res => this.playlist = res)
  },

  _updateStatus() {
    this._exec('status', res => {
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
    this._exec('currentsong', res => {
      res.file = this.basename(res.file)
      this.currentSong = res
    })

    setTimeout(() => this._updateStatus(), 1000)
  },

  _exec(command, callback) {
    if (Que.MPD_ERROR) return

    Que.post({
      url: 'http://10.0.0.2:6611/' + command,
      withCredentials: false,
      success: res => {
        callback && callback(res)
        Que.MPD_ERROR = false
      },
      fail: err => {
        Que.MPD_ERROR = '服务端连接错误'
      }
    })
  },

  /////////////////////////////////////////////////////////
  // Document events
  /////////////////////////////////////////////////////////

  _addBackListener() {
    document.addEventListener("backbutton", () => {
      if (this.menuOn) {
        this.hideMenu()
      } else
      if (this._directory && this.tabIndex === 1) {
        this._directory = this._directory.substr(0, this._directory.lastIndexOf('/'))
        this._getFilelist(this._directory)
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
    let minutes = Math.floor(sec / 60)
    let seconds = Math.floor((sec % 60) % 60)
    seconds = seconds < 10 ? '0' + seconds : seconds
    return minutes + ':' + seconds
  },

})
