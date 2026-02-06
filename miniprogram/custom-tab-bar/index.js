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
  attached() {
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      wx.switchTab({url})
      this.setData({
        selected: data.index
      })
    }
  }
})