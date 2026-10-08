import './style.css'
import { supabase } from './supabase.js'

const email = document.getElementById('email')
const password = document.getElementById('password')
const message = document.getElementById('message')

function checkInput() {
  if (!email.value.trim() || password.value.length < 6) {
    message.textContent = 'Vui lòng nhập email và mật khẩu từ 6 ký tự.'
    return false
  }
  return true
}

document.getElementById('signup').onclick = async () => {
  if (!checkInput()) return
  const { error } = await supabase.auth.signUp({
    email: email.value.trim(),
    password: password.value,
  })
  message.textContent = error
    ? 'Lỗi: ' + error.message
    : 'Tạo tài khoản thành công, hãy đăng nhập.'
}

document.getElementById('signin').onclick = async () => {
  if (!checkInput()) return
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value.trim(),
    password: password.value,
  })
  if (error) {
    message.textContent = 'Lỗi: ' + error.message
  } else {
    window.location.href = '/choose.html'
  }
}