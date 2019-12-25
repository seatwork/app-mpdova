new Que({
  data: {
    tabIndex: 0,
    dirPath: '',
    status: {},
    currentSong: {},
    playlist: [],
    filelist: [],
    menuShow: false,
    timestop: 0,
    countdown: 0,
    errmsg: ''
  },

  ready() {
    this.mpd = new MPD('10.0.0.2', 6600)
    this.switchTab(0)
    this._updateStatus()
    // this.updater = setInterval(() => this._updateStatus(), 1000)
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
    this._exec('play ' + e.currentTarget.dataset.pos, () => this.status.state = 'play')
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
    this._exec('repeat ' + Math.pow(0, this.status.repeat))
  },

  single() {
    this._exec('single ' + Math.pow(0, this.status.single))
  },

  random() {
    this._exec('random ' + Math.pow(0, this.status.random))
  },

  update() {
    this._exec('update')
  },

  showMenu() {
    this.menuShow = true
  },

  hideMenu() {
    this.menuShow = false
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
    this._exec('seekcur ' + time)
  },

  setTiming(e) {
    this.timestop = e.currentTarget.dataset.time
    this.countdown = this.timestop * 60

    if (this.timetask) {
      clearInterval(this.timetask)
    }
    this.timetask = setInterval(() => {
      this.countdown -= 1
      if (this.countdown == 0) {
        this.timestop = 0
        this._exec('stop')
        clearInterval(this.timetask)
      }
    }, 1000)
  },

  backToTop() {
    document.querySelector('main').scrollTop = 0
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
      this._confirm('从播放列表移除', () => this._exec('delete ' + pos, () => this._pl()))
    })
  },

  removeTouchEnd(e) {
    clearTimeout(e.currentTarget.timer)
  },

  addTouchStart(e) {
    let data = e.currentTarget.dataset
    this._longpress(e.currentTarget, () => {
      this._confirm('添加到播放列表', () => this._exec('add ' + (data.dir || data.file)))
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
    this._exec('lsinfo ' + path, res => this.filelist = res)
  },

  _pl() {
    this._exec('playlistinfo', res => this.playlist = res);
  },

  _updateStatus() {
    if (this.status.state == 'stop') return

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
    this.mpd.send({
      command: command,
      ondata(res) {
        callback && callback(res)
      },
      onerror(err) {
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
    return MPD.formatDuration(sec)
  },

})
