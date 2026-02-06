// custom-tab-bar/index.js
Component({
  data: {
    selected: 0,
    color: '#cbd5e1',
    selectedColor: '#4caf50',
    list: [
      {
        pagePath: '/pages/index/index',
        text: '大厅',
        iconPath: '/images/icon-home.png',
        selectedIconPath: '/images/icon-home-active.png'
      },
      {
        pagePath: '/pages/stats/stats',
        text: '战绩',
        iconPath: '/images/icon-history.png',
        selectedIconPath: '/images/icon-history-active.png'
      }
    ]
  },
  methods: {
    // 供页面调用的方法
    updateIndex(index) {
      this.setData({
        selected: index
      })
    },
    switchTab(e) {
      const data = e.currentTarget.dataset
      wx.switchTab({ url: data.path })
      // 内部不需要再 setData，统一交给页面的 onShow 处理
    }
  }
})