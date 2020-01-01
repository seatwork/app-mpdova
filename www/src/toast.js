window.Toast = {

  dialog(options) {
    // Merge custom options
    options = Object.assign({
      content: '',
      buttons: [{
        label: '确定',
        type: 'primary',
        onClick: () => instance.hide()
      }]
    }, options)

    // Create element container
    const instance = $(`
      <div class="toast-mask toast-dialog">
        <div class="toast-dialog-panel">
          <div class="toast-dialog-body">${options.content}</div>
          <div class="toast-dialog-footer"></div>
        </div>
      </div>
    `)
    // Add hide method to instance
    instance.hide = () => {
      instance.addClass('toast-fade-out')
      instance.on('animationend', () => instance.remove())
    }

    // Add custom buttons to instance
    const footer = instance.querySelector('.toast-dialog-footer')
    options.buttons.forEach(item => {
      let button = $(`<div class="toast-dialog-button ${item.type}">${item.label}</div>`)
      button.on('click', () => {
        instance.hide()
        item.onClick && item.onClick()
      })
      footer.appendChild(button)
    })

    // Show dialog
    document.body.appendChild(instance)
    instance.addClass('toast-fade-in')
    return instance
  },

  alert(message) {
    this.dialog({ content: message })
  },

  confirm(message, callback) {
    const instance = this.dialog({
      content: message,
      buttons: [{
        label: '确定',
        type: 'primary',
        onClick: callback
      }, {
        label: '取消',
        type: 'default',
        onClick: () => instance.hide()
      }]
    })
  },

  info(message, options) {
    // Check singleton instance
    if (Toast._singleton) return
    Toast._singleton = true

    // Merge custom options
    if (typeof options === 'number') {
      options = { duration: options }
    }
    options = Object.assign({
      duration: 3000,
      background: 'rgba(0, 0, 0, 0.6)'
    }, options)

    // Create element container
    const instance = $(`
      <div class="toast-mask toast-info">
        <div style="background:${options.background}">${message}</div>
      </div>
    `)

    // Show instance
    document.body.appendChild(instance)
    instance.addClass('toast-fade-in')

    // Auto hide delay
    setTimeout(() => {
      instance.addClass('toast-fade-out')
      instance.on('animationend', () => {
        instance.remove()
        Toast._singleton = false
      })
    }, options.duration)
  },

  error(message, options = {}) {
    if (typeof options === 'number') {
      options = { duration: options }
    }
    options.background = 'rgba(217, 37, 7, 0.6)'
    this.info(message, options)
  },

  success(message, options = {}) {
    if (typeof options === 'number') {
      options = { duration: options }
    }
    options.background = 'rgba(43, 155, 23, 0.6)'
    this.info(message, options)
  },

  actionSheet(menus = []) {
    // Create element container
    const instance = $(`
      <div>
        <div class="toast-mask"></div>
        <div class="toast-actionsheet"></div>
      </div>
    `)
    // Add hide method to instance
    instance.hide = () => {
      mask.addClass('toast-fade-out')
      sheet.addClass('toast-slide-down')
      sheet.on('animationend', () => instance.remove())
    }

    // Add click event to mask
    const mask = instance.querySelector('.toast-mask')
    mask.onclick = () => instance.hide()

    // Add custom menus to sheet
    const sheet = instance.querySelector('.toast-actionsheet')
    menus.push({ label: '取消', onClick: () => instance.hide() })
    menus.forEach(item => {
      let menu = $(`<div class="toast-actionsheet-menu">${item.label}</div>`)
      menu.on('click', () => {
        instance.hide()
        item.onClick && item.onClick()
      })
      sheet.appendChild(menu)
    })

    // Show actionsheet
    document.body.appendChild(instance)
    mask.addClass('toast-fade-in')
    sheet.addClass('toast-slide-up')
    return instance
  }
}

Object.assign(Element.prototype, {
  addClass(name) {
    this.classList.add(name)
    return this
  },
  removeClass(name) {
    this.classList.remove(name)
    return this
  },
  on(event, fn) {
    this.addEventListener(event, fn)
    return this
  },
  off(event, fn) {
    this.removeEventListener(event, fn)
    return this
  },
  remove() {
    return this.parentNode && this.parentNode.removeChild(this)
  },
})

Object.assign(window, {
  $(selector) {
    selector = selector.replace('/[\t\r\n]/mg', '').trim()
    if (selector.startsWith('<')) {
      const fragment = document.createRange().createContextualFragment(selector)
      return fragment.firstChild
    }
    return document.querySelector(selector)
  }
})
