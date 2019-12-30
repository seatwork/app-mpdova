class PullRefresh {

  constructor() {
    this.maxPos = 160
    this.activePos = 80
    this.status = 0
    this.startY = 0

    // 同一元素的无限旋转动画与下拉动画冲突，故创建单独的图标元素
    this.icon = document.createElement('div')
    this.el = document.createElement('div')
    this.el.className = 'loading'
    this.el.appendChild(this.icon)
    document.body.appendChild(this.el)
  }

  hide() {
    this.toward(0)
    this.icon.classList.remove('rotate')
  }

  toward(y, d) {
    // 根据抵达 maxPos 的比例旋转图标
    let degree = d || (y / this.maxPos) * 360

    // 根据抵达 activePos 的比例调整透明度
    let opacity = y / this.activePos
    if (opacity > 1) opacity = 1

    this.el.style.transform = 'translateY(' + y + 'px) rotate(' + degree + 'deg)'
    this.el.style.opacity = opacity
  }

  bind(target, callback) {
    target.addEventListener('touchstart', e => {
      // 取消回弹动画，以避免下拉时的错位
      this.el.classList.remove('trans')

      if (target.scrollTop == 0) {
        this.status = 1
        this.startY = e.touches[0].pageY
        this.el.style.visibility = 'visible'
      } else {
        this.status = 0
        this.startY = 0
      }
    })

    target.addEventListener('touchmove', e => {
      // 忽略未抵达顶部的滑动
      if (this.status == 0) return
      const offsetY = e.touches[0].pageY - this.startY
      // 忽略向上滑动
      if (offsetY <= 0) return

      // 滑动抵达 activePos 后将状态置为2：可触发刷新回调
      this.status = offsetY >= this.activePos ? 2 : 1
      // 抵达 maxPos 之前图标跟随运动
      if (offsetY < this.maxPos) {
        this.toward(offsetY)
      }
    })

    target.addEventListener('touchend', e => {
      // 增加回弹动画
      this.el.classList.add('trans')
      // 回弹到 activePos 并触发回调
      if (this.status == 2) {

        this.toward(this.activePos)
        this.icon.classList.add('rotate')
        callback()
      } else {
        // 恢复原状
        this.toward(0)
      }
    })
  }

}
