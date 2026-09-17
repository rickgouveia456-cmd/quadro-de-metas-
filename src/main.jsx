import { createRoot } from 'react-dom/client'
import App from './App.jsx'

const root = document.getElementById('root')
if (!root) {
  document.body.innerHTML = '<h1 style="color:red">root element not found</h1>'
} else {
  try {
    createRoot(root).render(<App />)
  } catch(e) {
    root.innerHTML = `<pre style="color:red;padding:20px;font-size:13px">${e.message}\n${e.stack}</pre>`
  }
}
