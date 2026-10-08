import Phaser from 'phaser'
import './style.css'
import { supabase } from './supabase.js'

const params = new URLSearchParams(window.location.search)
const roomName = params.get('room') || 'Phòng học'
document.getElementById('room-name').textContent = roomName

const statusEl = document.getElementById('status')
const timerEl = document.getElementById('timer')
const pauseBtn = document.getElementById('pause')
const onlineEl = document.getElementById('online')

/* ---------- Trạng thái chung ---------- */
let me = { userId: null, character: 'boy' }
let channel = null
let mySeat = null // id ghế mình đang ngồi, null nếu đang đứng
let others = {} // người khác trong phòng: { userId: { character, seat } }
let sitting = false
let sceneRef = null

/* ---------- Pomodoro ---------- */
const WORK = 25 * 60
const BREAK = 5 * 60
let mode = 'work'
let remaining = WORK
let interval = null

function render() {
  const m = String(Math.floor(remaining / 60)).padStart(2, '0')
  const s = String(remaining % 60).padStart(2, '0')
  timerEl.textContent = `${m}:${s}`
}

function pomodoroStart() {
  if (interval) return
  let end = Date.now() + remaining * 1000
  interval = setInterval(() => {
    remaining = Math.max(0, Math.round((end - Date.now()) / 1000))
    render()
    if (remaining === 0) {
      mode = mode === 'work' ? 'break' : 'work'
      remaining = mode === 'work' ? WORK : BREAK
      end = Date.now() + remaining * 1000
      statusEl.textContent = mode === 'work' ? 'Đang học tập trung 📚' : 'Nghỉ giải lao 5 phút ☕'
      render()
    }
  }, 250)
  pauseBtn.textContent = 'Tạm dừng'
}

function pomodoroPause() {
  clearInterval(interval)
  interval = null
  pauseBtn.textContent = 'Tiếp tục'
}

pauseBtn.onclick = () => {
  if (!sitting) return
  interval ? pomodoroPause() : pomodoroStart()
}

/* ---------- Báo vị trí của mình lên kênh ---------- */
function track() {
  if (channel) channel.track({ character: me.character, seat: mySeat })
}

/* ---------- Game ---------- */
const COLORS = { boy: 0x3b82f6, girl: 0xf472b6 }
const DESK_X = [90, 270]
const DESK_Y = [120, 260, 400]

function seatPos(id) {
  const [xi, yi] = id.split('-').map(Number)
  return { x: DESK_X[xi], y: DESK_Y[yi] + 48 }
}

// Vị trí đứng của người chưa ngồi, tính từ id để mỗi người một chỗ khác nhau
function standPos(userId) {
  let h = 0
  for (const c of userId) h = (h * 31 + c.charCodeAt(0)) % 1000
  return { x: 40 + (h % 280), y: 520 }
}

function startGame() {
  class RoomScene extends Phaser.Scene {
    create() {
      sceneRef = this
      this.others = {}
      this.add.rectangle(180, 280, 360, 560, 0xf3e8d0)

      DESK_Y.forEach((y, yi) => {
        DESK_X.forEach((x, xi) => {
          this.add.rectangle(x, y, 110, 50, 0x8b5a2b)
          const id = `${xi}-${yi}`
          const chair = this.add.rectangle(x, y + 48, 36, 28, 0xb45309)
          chair.setInteractive({ useHandCursor: true })
          chair.on('pointerdown', () => this.goSit(id))
        })
      })

      this.player = this.add.circle(180, 520, 16, COLORS[me.character])
      this.player.setStrokeStyle(3, 0xffffff)
      this.player.setDepth(2)
      this.refreshOthers()
    }

    goSit(id) {
      const taken = Object.values(others).some((o) => o.seat === id)
      if (taken) {
        statusEl.textContent = 'Ghế này đã có bạn khác ngồi rồi'
        return
      }
      const { x, y } = seatPos(id)
      if (this.moveTween) this.moveTween.stop()
      pomodoroPause()
      sitting = false
      mySeat = null
      track()
      statusEl.textContent = 'Đang đi tới ghế...'
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y)
      this.moveTween = this.tweens.add({
        targets: this.player,
        x,
        y,
        duration: Math.max(300, dist * 4),
        ease: 'Sine.easeInOut',
        onComplete: () => {
          sitting = true
          mySeat = id
          track()
          this.player.setScale(0.8)
          statusEl.textContent = mode === 'work' ? 'Đang học tập trung 📚' : 'Nghỉ giải lao 5 phút ☕'
          pomodoroStart()
        },
      })
    }

    standUp() {
      if (this.moveTween) this.moveTween.stop()
      pomodoroPause()
      sitting = false
      mySeat = null
      track()
      this.player.setScale(1)
      this.tweens.add({ targets: this.player, x: 180, y: 520, duration: 600 })
      statusEl.textContent = 'Chạm vào một chiếc ghế để ngồi'
      pauseBtn.textContent = 'Tạm dừng'
    }

    // Vẽ lại tất cả bạn khác theo dữ liệu mới nhất
    refreshOthers() {
      Object.keys(this.others).forEach((key) => {
        if (!others[key]) {
          this.others[key].destroy()
          delete this.others[key]
        }
      })
      Object.entries(others).forEach(([key, info]) => {
        const pos = info.seat ? seatPos(info.seat) : standPos(key)
        let sprite = this.others[key]
        if (!sprite) {
          sprite = this.add.circle(pos.x, pos.y, 16, COLORS[info.character] || COLORS.boy)
          sprite.setStrokeStyle(2, 0xffffff)
          sprite.setAlpha(0.85)
          this.others[key] = sprite
        }
        sprite.setScale(info.seat ? 0.8 : 1)
        this.tweens.add({ targets: sprite, x: pos.x, y: pos.y, duration: 500 })
      })
    }
  }

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 360,
    height: 560,
    backgroundColor: '#f3e8d0',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
    scene: RoomScene,
  })
}

document.getElementById('stand').onclick = () => sceneRef && sceneRef.standUp()

/* ---------- Khởi động ---------- */
async function boot() {
  const { data } = await supabase.auth.getSession()
  if (!data.session) {
    window.location.href = '/login.html'
    return
  }
  me.userId = data.session.user.id

  const { data: profile } = await supabase
    .from('profiles')
    .select('character')
    .eq('id', me.userId)
    .maybeSingle()
  me.character = profile?.character === 'girl' ? 'girl' : 'boy'

  startGame()

  // Mỗi phòng là một kênh riêng
  channel = supabase.channel('room:' + encodeURIComponent(roomName), {
    config: { presence: { key: me.userId } },
  })

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    others = {}
    Object.entries(state).forEach(([key, metas]) => {
      if (key !== me.userId) others[key] = metas[metas.length - 1]
    })
    onlineEl.textContent = `Đang online trong phòng: ${Object.keys(state).length} bạn`
    if (sceneRef) sceneRef.refreshOthers()
  })

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') track()
  })

  window.addEventListener('beforeunload', () => supabase.removeChannel(channel))
}

render()
boot()