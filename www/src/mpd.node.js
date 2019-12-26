/**
 * MPD (Music Player Daemon) Restful API (HTTP Server)
 * https://www.musicpd.org
 *
 * Common Commands:
 * /status        - Get player status
 * /lsinfo/:path  - Get file list by path
 * /playlistinfo  - Get play list
 * /add/:path     - Add to playlist with path
 * /delete/:pos   - Remove from playlist by position in playlist
 * /seekcur/:time - Seek by current time
 * /play/:pos     - Play song by position in playlist
 * /stop          - Stop song
 * /pause         - Pause song
 * /next          - Next song
 * /previous      - Previous song
 * /repeat/(0|1)  - Repeat track
 * /single/(0|1)  - Single track
 * /random/(0|1)  - Random track
 * /update        - Update libary
 * /clear         - Clear playlist
 *
 * Available Commands:
 * MPD.COMMANDS = ['add', 'addid', 'clear', 'clearerror', 'close', 'commands', 'consume', 'count', 'crossfade', 'currentsong', 'decoders', 'delete', 'deleteid', 'disableoutput', 'enableoutput', 'find', 'findadd', 'idle', 'kill', 'list', 'listall', 'listallinfo', 'listfiles', 'listplaylist', 'listplaylistinfo', 'listplaylists', 'load', 'lsinfo', 'mixrampdb', 'mixrampdelay', 'move', 'moveid', 'next', 'notcommands', 'outputs', 'password', 'pause', 'ping', 'play', 'playid', 'playlist', 'playlistadd', 'playlistclear', 'playlistdelete', 'playlistfind', 'playlistid', 'playlistinfo', 'playlistmove', 'playlistsearch', 'plchanges', 'plchangesposid', 'previous', 'random', 'rename', 'repeat', 'replay_gain_mode', 'replay_gain_status', 'rescan', 'rm', 'save', 'search', 'seek', 'seekcur', 'seekid', 'setvol', 'shuffle', 'single', 'stats', 'status', 'sticker', 'stop', 'swap', 'swapid', 'tagtypes', 'update', 'urlhandlers']
 */

const net = require('net')
const http = require('http')

class MPD {

  constructor(host, port) {
    MPD.VERSION = /^OK MPD [\.\d]+\n/m
    MPD.OK = /^OK$/m
    MPD.ERROR = /^ACK (.*)$/m

    this.server = { host, port }
    this.buffer = ''
  }

  _sendCommand(command) {
    return new Promise((resolve, reject) => {
      const socket = net.connect(this.server, () => {

        socket.setEncoding('utf8')
        socket.write(command + '\n')

        socket.on('error', err => reject(err))
        socket.on('data', chunk => {
          let data = this._receive(chunk)
          if (data) {
            socket.end()
            data.error ? reject(data.error) : resolve(data)
          }
        })
      })
    })
  }

  _receive(chunk) {
    chunk = chunk.replace(MPD.VERSION, '')
    this.buffer += chunk
    let match, data

    if (match = this.buffer.match(MPD.ERROR)) {
      data = { error: match[1] }
      this.buffer = ''
    } else
    if (match = this.buffer.match(MPD.OK)) {
      data = this.buffer.substring(0, match.index)
      data = data.trim().split('\n')
      this.buffer = ''
    }
    return data
  }

  _parseStatus(res) {
    const result = {}
    res.forEach(line => {
      line = line.split(': ')
      result[line[0]] = isFinite(line[1]) ? parseFloat(line[1]) : line[1]
    })
    return result
  }

  _parseFilelist(res) {
    const result = []
    let item = null

    res.forEach(line => {
      if (line) {
        line = line.split(': ')
        let prop = line[0], value = line[1]

        if (prop == 'directory' || prop == 'file') {
          item = {}
          result.push(item)
        }
        if (prop == 'Time') {
          value = this._formatDuration(value)
        }
        item[prop] = value
      }
    })
    return result
  }

  _sortFilelist(res) {
    return res.sort((a, b) => {
      if (a.directory && !b.directory) return -1
      let x = a.directory || a.file
      let y = b.directory || b.file
      return x.localeCompare(y, 'zh')
    })
  }

  _formatDuration(sec) {
    let minutes = Math.floor(sec / 60)
    let seconds = Math.floor((sec % 60) % 60)
    return minutes + ':' + String(seconds).padStart(2, '0')
  }

  _setSchedule(params) {
    // Request: schedule - Return countdown
    params = params.split('/')
    if (params.length == 1) {
      return {
        delay: this.delay || 0,
        countdown: this.countdown || 0
      }
    }

    // Request: schedule/0 - Stop schedule
    this._clearSchedule()
    this.delay = this.countdown = parseInt(params[1]) || 0
    if (this.delay <= 0) {
      return 0
    }

    // Request: schedule/{delay} - Start schedule
    this.scheduler = setInterval(() => {
      this.countdown -= 1
      if (this.countdown == 0) {
        this._clearSchedule()
        this._sendCommand('stop')
      }
    }, 1000)
    return 0
  }

  _clearSchedule() {
    this.delay = this.countdown = 0
    if (this.scheduler) {
      clearInterval(this.scheduler)
    }
  }

  async _service(request, response) {
    const params = request.url.substring(1)
    const command = decodeURI(params.replace(/\/(.*)$/, ' "$1"'))
    let result = null

    try {
      if (params.startsWith('schedule')) {
        result = this._setSchedule(params)
      } else {
        result = await this._sendCommand(command)
        if (command == 'status' || command == 'currentsong') {
          result = this._parseStatus(result)
        } else
        if (command == 'playlistinfo') {
          result = this._parseFilelist(result)
        } else
        if (command.startsWith('lsinfo')) {
          result = this._parseFilelist(result)
          result = this._sortFilelist(result)
        }
      }
    } catch (error) {
      result = { error }
    }

    response.setHeader("Access-Control-Allow-Origin", "*")
    response.setHeader("Access-Control-Allow-Headers", "*")
    response.setHeader("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS")
    response.setHeader("Content-Type", "application/json;charset=utf-8")

    response.write(JSON.stringify(result))
    response.end()
  }

  run(port) {
    http.createServer((r, q) => this._service(r, q)).listen(port, () => {
      console.log('Server is running on: http://localhost:%s', port)
      console.log('API usage: http://localhost:%s/:command/:args', port)
    })
  }
}

/**
 * Running API service
 * > node mpd.js
 */
const mpd = new MPD('10.0.0.2', 6600)
mpd.run(6611)
