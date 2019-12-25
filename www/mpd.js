/**
 * MPD (Music Player Daemon) Restful API
 * https://www.musicpd.org
 *
 * Common Commands:
 * status         - Get player status
 * lsinfo [path]  - Get file list by path
 * playlistinfo   - Get play list
 * add [path]     - Add to playlist with path
 * delete [pos]   - Remove from playlist by position in playlist
 * seekcur [time] - Seek by current time
 * play [pos]     - Play song by position in playlist
 * stop          - Stop song
 * pause         - Pause song
 * next          - Next song
 * previous      - Previous song
 * repeat [0|1]  - Repeat track
 * single [0|1]  - Single track
 * random [0|1]  - Random track
 * update        - Update libary
 * clear         - Clear playlist
 *
 * Available Commands:
 * MPD.COMMANDS = ['add', 'addid', 'clear', 'clearerror', 'close', 'commands', 'consume', 'count', 'crossfade', 'currentsong', 'decoders', 'delete', 'deleteid', 'disableoutput', 'enableoutput', 'find', 'findadd', 'idle', 'kill', 'list', 'listall', 'listallinfo', 'listfiles', 'listplaylist', 'listplaylistinfo', 'listplaylists', 'load', 'lsinfo', 'mixrampdb', 'mixrampdelay', 'move', 'moveid', 'next', 'notcommands', 'outputs', 'password', 'pause', 'ping', 'play', 'playid', 'playlist', 'playlistadd', 'playlistclear', 'playlistdelete', 'playlistfind', 'playlistid', 'playlistinfo', 'playlistmove', 'playlistsearch', 'plchanges', 'plchangesposid', 'previous', 'random', 'rename', 'repeat', 'replay_gain_mode', 'replay_gain_status', 'rescan', 'rm', 'save', 'search', 'seek', 'seekcur', 'seekid', 'setvol', 'shuffle', 'single', 'stats', 'status', 'sticker', 'stop', 'swap', 'swapid', 'tagtypes', 'update', 'urlhandlers']
 */

class MPD {

  constructor(host, port) {
    MPD.VERSION = /^OK MPD [\.\d]+\n/m
    MPD.OK = /^OK$/m
    MPD.ERROR = /^ACK (.*)$/m

    this.host = host
    this.port = port
    this.buffer = ''
    this.callbackQueue =[]
    this.socket = new Socket()
    this._handleSocket()
  }

  send(options) {
    switch (this.socket.state) {
      case Socket.State.CLOSING:
      case Socket.State.CLOSED: return this._open(options)
      case Socket.State.OPENED: return this._write(options)
      default: return;
    }
  }

  _handleSocket() {
    this.socket.onData = chunk => {
      let data = this._receive(chunk)
      if (!data) return

      let callback = this.callbackQueue.shift()
      data.error
        ? callback.onerror(data.error)
        : callback.ondata(this._parse(callback.command, data))
    }
    this.socket.onError = res => {
      this.socket.close()
      callback.onerror(res)
    }
    this.socket.onClose = res => {
      this.callbackQueue.length = 0
      callback.onerror(res)
    }
  }

  _open(callback) {
    this.socket.open(this.host, this.port, () => {
      this.send(callback)
    }, err => {
      callback.onerror('Open socket error: ' + err)
    })
  }

  _write(callback) {
    let command = callback.command.replace(/ (.*)$/, ' "$1"')
    this.socket.write(command + '\n', () => {
      this.callbackQueue.push(callback)
    }, err => {
      callback.onerror('Send message error: ' + err)
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

  _parse(command, data) {
    if (command == 'status' || command == 'currentsong') {
      return this._parseStatus(data)
    } else
    if (command == 'playlistinfo' || command.startsWith('lsinfo')) {
      return this._parsePlaylist(data)
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

  _parsePlaylist(res) {
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
          value = MPD.formatDuration(value)
        }
        item[prop] = value
      }
    })

    return result.sort((a, b) => {
      if (a.directory && !b.directory) {
        return -1
      }
      let x = a.directory || a.file
      let y = b.directory || b.file
      return x.localeCompare(y, 'zh')
    })
  }

}

MPD.formatDuration = function(sec) {
  let minutes = Math.floor(sec / 60)
  let seconds = Math.floor((sec % 60) % 60)
  seconds = seconds < 10 ? '0' + seconds : seconds
  return minutes + ':' + seconds
}
