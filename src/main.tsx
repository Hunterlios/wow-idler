import { createRoot } from 'react-dom/client'
import { App } from './ui/App'
import { installClickThrough, lockScroll } from './platform'
import './ui/styles.css'

installClickThrough()
lockScroll()
createRoot(document.getElementById('root')!).render(<App />)
