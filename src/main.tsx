import { createRoot } from 'react-dom/client'
import { App } from './ui/App'
import { installClickThrough } from './platform'
import './ui/styles.css'

installClickThrough()
createRoot(document.getElementById('root')!).render(<App />)
