   import './style.css'
   import { supabase } from './supabase.js'

   const message = document.getElementById('message')
   const buttons = document.querySelectorAll('.char')

   function highlight(character) {
     buttons.forEach((b) => b.classList.toggle('selected', b.dataset.char === character))
   }

   async function init() {
     const { data } = await supabase.auth.getSession()
     const session = data.session
     if (!session) {
       window.location.href = '/login.html'
       return
     }

     const { data: profile } = await supabase
       .from('profiles')
       .select('character')
       .eq('id', session.user.id)
       .maybeSingle()
     if (profile) highlight(profile.character)

     buttons.forEach((b) => {
       b.onclick = async () => {
         const { error } = await supabase.from('profiles').upsert({
           id: session.user.id,
           character: b.dataset.char,
           updated_at: new Date().toISOString(),
         })
         if (error) {
           message.textContent = 'Lỗi: ' + error.message
         } else {
           highlight(b.dataset.char)
           message.textContent = 'Đã lưu nhân vật!'
         }
       }
     })
   }

   document.getElementById('signout').onclick = async () => {
     await supabase.auth.signOut()
     window.location.href = '/login.html'
   }

   init()