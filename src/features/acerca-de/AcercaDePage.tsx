import { Mail, Globe, Code2, Briefcase } from 'lucide-react'

export default function AcercaDePage() {
  return (
    <div className="animate-fade-in flex items-center justify-center min-h-[calc(100vh-140px)]">
      <div className="bg-white border rounded-2xl shadow-sm p-10 flex flex-col items-center max-w-lg w-full" style={{ borderColor: 'var(--color-border-light)' }}>
        {/* Logo */}
        <img 
          src="/sgilcolor.png" 
          alt="SGIL Logo" 
          className="mb-8"
          style={{ height: '80px', objectFit: 'contain' }}
        />

        {/* Version */}
        <p className="text-sm font-medium mb-6" style={{ color: 'var(--color-text-muted)' }}>
          Versión 2.0
        </p>

        {/* Divider */}
        <div className="w-full h-px mb-8" style={{ backgroundColor: 'var(--color-border-light)' }} />

        {/* Author Info */}
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Mauricio Alejandro Montero
        </h2>
        <p className="text-[15px] font-medium text-center mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          Ingeniero en Sistemas de Información / Desarrollador Web Full-Stack
        </p>
        <p className="text-[13px] font-medium mb-8" style={{ color: 'var(--color-text-muted)' }}>
          (C) 2026. Todos los derechos reservados.
        </p>

        {/* Buttons Grid */}
        <div className="grid grid-cols-2 gap-4 w-full">
          <a 
            href="mailto:contacto@ejemplo.com" 
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border hover:bg-gray-50 transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <Mail size={18} />
            <span className="text-sm font-semibold">Contacto</span>
          </a>
          <a 
            href="#" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border hover:bg-gray-50 transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <Globe size={18} />
            <span className="text-sm font-semibold">Portfolio</span>
          </a>
          <a 
            href="#" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border hover:bg-gray-50 transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <Code2 size={18} />
            <span className="text-sm font-semibold">GitHub</span>
          </a>
          <a 
            href="#" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border hover:bg-gray-50 transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <Briefcase size={18} />
            <span className="text-sm font-semibold">LinkedIn</span>
          </a>
        </div>
      </div>
    </div>
  )
}
