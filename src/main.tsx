import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AudioProvider } from './audio/AudioContext'
import './battleVisualRefresh.css'
import './cardReadability.css'
import './attackClarity.css'
import './battleLayoutV2.css'
import './playerFieldMirror.css'
import './inlineTurnControls.css'
import './inlineTurnControls'
import './rightBattleInfoDock.css'
import './rightBattleInfoDock'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AudioProvider>
      <App />
    </AudioProvider>
  </React.StrictMode>,
)
