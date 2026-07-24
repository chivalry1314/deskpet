import { useEffect, useState, Suspense, lazy } from 'react'
import Manager from './components/Manager'
import Viewer from './components/Viewer'

const Editor = lazy(() => import('./components/Editor'))

export type View = 'manager' | 'editor'

function parseRoute(): { view: View; petName: string | null } {
  const hash = window.location.hash
  if (!hash || hash === '#/') return { view: 'manager', petName: null }
  const [path, query] = hash.slice(1).split('?')
  const params = new URLSearchParams(query || '')
  if (path.startsWith('/viewer')) return { view: 'manager', petName: params.get('petName') || null }
  if (path.startsWith('/editor')) return { view: 'editor', petName: params.get('petName') || null }
  if (path.startsWith('/manager')) return { view: 'manager', petName: null }
  return { view: 'manager', petName: null }
}

function App() {
  const [{ view, petName }, setRoute] = useState(parseRoute())

  useEffect(() => {
    function onHashChange() {
      setRoute(parseRoute())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (window.location.hash.startsWith('#/viewer')) {
    return <Viewer />
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 text-slate-800">
      {view === 'manager' && (
        <Manager
          onCreate={() => {
            window.location.hash = '#/editor'
          }}
          onEdit={(name) => {
            window.location.hash = `#/editor?petName=${encodeURIComponent(name)}`
          }}
        />
      )}
      {view === 'editor' && (
        <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-slate-500">加载编辑器...</div>}>
          <Editor
            petName={petName}
            onBack={() => {
              window.location.hash = '#/manager'
            }}
            onSaved={() => {
              window.location.hash = '#/manager'
            }}
          />
        </Suspense>
      )}
    </div>
  )
}

export default App
