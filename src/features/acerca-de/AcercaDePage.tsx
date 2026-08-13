import { Mail, Globe, Code2, Briefcase } from 'lucide-react'

export default function AcercaDePage() {
  return (
    <div className="animate-fade-in flex items-center justify-center min-h-[calc(100vh-140px)]">
      <div className="bg-white border rounded-2xl shadow-sm p-12 md:p-16 flex flex-col items-center max-w-2xl w-full" style={{ borderColor: 'var(--color-border-light)' }}>
        {/* Logo */}
        <img 
          src="/sgilcolor.png" 
          alt="SGIL Logo" 
          className="mb-10"
          style={{ height: '90px', objectFit: 'contain' }}
        />

        {/* Version */}
        <p className="text-sm font-medium mb-8" style={{ color: 'var(--color-text-muted)' }}>
          Versión 2.0
        </p>

        {/* Divider */}
        <div className="w-full h-px mb-10" style={{ backgroundColor: 'var(--color-border-light)' }} />

        {/* Author Info */}
        <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
          Mauricio Alejandro Montero
        </h2>
        <p className="text-[16px] font-medium text-center mb-5" style={{ color: 'var(--color-text-secondary)' }}>
          Ingeniero en Sistemas de Información / Desarrollador Web Full-Stack
        </p>
        <p className="text-[14px] font-medium mb-12" style={{ color: 'var(--color-text-muted)' }}>
          (C) 2026. Todos los derechos reservados.
        </p>

        {/* Buttons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <a 
            href="mailto:contacto@ejemplo.com" 
            className="flex items-center justify-center gap-3 py-4 px-6 rounded-xl border hover:bg-gray-50 transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <Mail size={20} />
            <span className="text-[15px] font-semibold">Contacto</span>
          </a>
          <a 
            href="https://mauriciomontero.lovable.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 py-4 px-6 rounded-xl border hover:bg-gray-50 transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <Globe size={20} />
            <span className="text-[15px] font-semibold">Portfolio</span>
          </a>
          <a 
            href="https://github.com/medicenalemon/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 py-4 px-6 rounded-xl border hover:bg-gray-50 transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <Code2 size={20} />
            <span className="text-[15px] font-semibold">GitHub</span>
          </a>
          <a 
            href="https://www.linkedin.com/in/mauricioalemon/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 py-4 px-6 rounded-xl border hover:bg-gray-50 transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <Briefcase size={20} />
            <span className="text-[15px] font-semibold">LinkedIn</span>
          </a>
        </div>
      </div>
    </div>
  )
}
