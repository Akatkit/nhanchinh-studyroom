import Phaser from 'phaser'
import './style.css'
import { supabase } from './supabase.js'

const params = new URLSearchParams(window.location.search)
document.getElementById('room-name').textContent = params.get('room') || 'Phòng học'

const statusEl = document.getElementById('status')
const timerEl = document.getElementById('timer')
const pauseBtn = document.getElementById('pause')

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

/* ---------- Game ---------- */
let sitting = false
let sceneRef = null

async function boot() {
  const { data } = await supabase.auth.getSession()
  if (!data.session) {
    window.location.href = '/login.html'
    return
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('character')
    .eq('id', data.session.user.id)
    .maybeSingle()

  const color = profile?.character === 'girl' ? 0xf472b6 : 0x3b82f6
  startGame(color)
}

function startGame(playerColor) {
  class RoomScene extends Phaser.Scene {
    create() {
      sceneRef = this
      this.add.rectangle(180, 280, 360, 560, 0xf3e8d0)

      const deskX = [90, 270]
      const deskY = [120, 260, 400]
      deskY.forEach((y) => {
        deskX.forEach((x) => {
          this.add.rectangle(x, y, 110, 50, 0x8b5a2b)
          const chair = this.add.rectangle(x, y + 48, 36, 28, 0xb45309)
          chair.setInteractive({ useHandCursor: true })
          chair.on('pointerdown', () => this.goSit(x, y + 48))
        })
      })

      this.player = this.add.circle(180, 520, 16, playerColor)
      this.player.setStrokeStyle(3, 0xffffff)
    }

    goSit(x, y) {
      if (this.moveTween) this.moveTween.stop()
      pomodoroPause()
      sitting = false
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
      this.player.setScale(1)
      this.tweens.add({ targets: this.player, x: 180, y: 520, duration: 600 })
      statusEl.textContent = 'Chạm vào một chiếc ghế để ngồi'
      pauseBtn.textContent = 'Tạm dừng'
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

render()
boot()