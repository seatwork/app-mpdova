new Que({
  data: {
    tabIndex: 0,
    dirPath: '',
    status: {},
    currentSong: {},
    playlist: [],
    filelist: [],
    menuShow: false,
    delay: 0,
    countdown: 0,
    errmsg: ''
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
    this.tabIndex = parseInt(e.currentTarget ? e.currentTarget.dataset.index : e)
    switch (this.tabIndex) {
      case 0: this._pl(); break
      case 1: this._ls(); break
      default: break
    }
  },

  opendir(e) {
    let dir = e.currentTarget.dataset.dir
    if (dir) {
      this.dirPath = dir
      this._ls(this.dirPath)
    }
  },

  play(e) {
    this._exec('play/' + e.currentTarget.dataset.pos, () => this.status.state = 'play')
  },

  toggle() {
    if (this.status.state == 'stop') {
      this._exec('play', () => this.status.state = 'play')
    } else {
      this._exec('pause')
    }
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
    this._exec('update')
  },

  showMenu() {
    this.menuShow = true
    this._exec('schedule', t => this._startCountdown(t))
  },

  hideMenu() {
    this.menuShow = false
    this._stopCountdown()
  },

  hideError() {
    this.errmsg = ''
  },

  clear() {
    this._confirm('确定清空播放列表吗？', () => {
      this._exec('clear')
      this.playlist = []
    })
  },

  seek(ratio) {
    let time = Math.round(this.currentSong.Time * ratio)
    this._exec('seekcur/' + time)
  },

  setSchedule(e) {
    if (this.delay) {
      this._confirm('取消定时停止播放', () => {
        this._exec('schedule/0', t => this._startCountdown(t))
        localStorage.removeItem('delay')
      })
    } else {
      const delay = parseInt(e.currentTarget.dataset.delay) * 60
      this._confirm('设置定时停止播放', () => {
        this.delay = delay
        this._exec('schedule/' + this.delay, t => this._startCountdown(t))
        localStorage.setItem('delay', this.delay)
      })
    }
  },

  backToTop() {
    document.querySelector('main').scrollTop = 0
  },

  /////////////////////////////////////////////////////////
  // Countdown timer
  /////////////////////////////////////////////////////////

  _startCountdown(t) {
    this._stopCountdown()
    if (!t) {
      this.countdown = 0
      this.delay = 0
      return
    }

    this.countdown = t
    this.delay = localStorage.getItem('delay') || 0

    this._cdTimer = setInterval(() => {
      this.countdown -= 1
      if (this.countdown == 0) {
        this.delay = 0
        this._stopCountdown()
      }
    }, 1000)
  },

  _stopCountdown() {
    if (this._cdTimer) {
      clearInterval(this._cdTimer)
    }
  },

  /////////////////////////////////////////////////////////
  // Longpress events
  /////////////////////////////////////////////////////////

  _longpress(el, fn) {
    el.timer = setTimeout(() => {
      navigator.vibrate(50); fn()
    }, 500)
  },

  _confirm(text, cb) {
    navigator.notification.confirm(text, index => {
      if (index == 1) cb()
    }, '', ['确定','取消'])
  },

  removeTouchStart(e) {
    let pos = e.currentTarget.dataset.pos
    this._longpress(e.currentTarget, () => {
      this._confirm('从播放列表移除', () => this._exec('delete/' + pos, () => this._pl()))
    })
  },

  removeTouchEnd(e) {
    clearTimeout(e.currentTarget.timer)
  },

  addTouchStart(e) {
    let data = e.currentTarget.dataset
    this._longpress(e.currentTarget, () => {
      this._confirm('添加到播放列表', () => this._exec('add/' + (data.dir || data.file)))
    })
  },

  addTouchEnd(e) {
    clearTimeout(e.currentTarget.timer)
  },

  stopTouchStart(e) {
    this._longpress(e.currentTarget, () => this._exec('stop'))
  },

  stopTouchEnd(e) {
    clearTimeout(e.currentTarget.timer)
  },

  /////////////////////////////////////////////////////////
  // Common execute
  /////////////////////////////////////////////////////////

  _ls(path = '') {
    this._exec('lsinfo/' + path, res => this.filelist = res)
  },

  _pl() {
    this._exec('playlistinfo', res => this.playlist = res);
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
    Que.post({
      url: 'http://10.0.0.2:6611/' + command,
      withCredentials: false,
      success(res) {
        callback && callback(res)
      },
      fail(err) {
        this.errmsg = err
      }
    })
  },

  /////////////////////////////////////////////////////////
  // Document events
  /////////////////////////////////////////////////////////

  _addBackListener() {
    document.addEventListener("backbutton", () => {
      if (this.menuShow) {
        this.menuShow = false
      } else
      if (this.dirPath && this.tabIndex === 1) {
        this.dirPath = this.dirPath.substr(0, this.dirPath.lastIndexOf('/'))
        this._ls(this.dirPath)
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
