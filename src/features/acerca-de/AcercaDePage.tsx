import { Mail, Globe, Code2, Briefcase } from 'lucide-react'

export default function AcercaDePage() {
  return (
    <div className="animate-fade-in flex items-center justify-center min-h-[calc(100vh-140px)] py-8">
      <div className="bg-white border rounded-3xl shadow-sm p-10 md:p-16 flex flex-col items-center justify-center max-w-3xl w-full min-h-[700px]" style={{ borderColor: 'var(--color-border-light)' }}>
        
        {/* Superior: Logo y Versión */}
        <div className="flex flex-col items-center flex-grow justify-end pb-10">
          <img 
            src="/sgilcolor.png" 
            alt="SGIL Logo" 
            className="mb-6"
            style={{ height: '110px', objectFit: 'contain' }}
          />
          <p className="text-base font-semibold tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            Versión 2.1
          </p>
        </div>

        {/* Divider */}
        <div className="w-full h-px my-2" style={{ backgroundColor: 'var(--color-border-light)' }} />

        {/* Medio: Info del Autor */}
        <div className="flex flex-col items-center flex-grow justify-start pt-10 w-full">
          <h2 className="text-3xl font-extrabold mb-4 tracking-tight text-center" style={{ color: 'var(--color-text-primary)' }}>
            Mauricio Alejandro Montero
          </h2>
          <p className="text-lg font-medium text-center mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            Ingeniero en Sistemas de Información <span className="hidden sm:inline mx-2 text-gray-300">|</span><br className="sm:hidden" /> Desarrollador Web Full-Stack
          </p>
          <p className="text-sm font-medium mb-12" style={{ color: 'var(--color-text-muted)' }}>
            &copy; 2026. Todos los derechos reservados.
          </p>

          {/* Inferior: Botones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 w-full max-w-2xl">
            <a 
              href="mailto:lacasadelatecnologia@protonmail.com" 
              className="flex items-center justify-center gap-3 py-4 px-6 rounded-2xl border hover:bg-gray-50 transition-all duration-200 hover:shadow-sm group"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              <Mail size={22} className="text-gray-500 group-hover:text-blue-600 transition-colors" />
              <span className="text-[15px] font-semibold">Contacto</span>
            </a>
            <a 
              href="https://mauriciomontero.lovable.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 py-4 px-6 rounded-2xl border hover:bg-gray-50 transition-all duration-200 hover:shadow-sm group"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              <Globe size={22} className="text-gray-500 group-hover:text-blue-600 transition-colors" />
              <span className="text-[15px] font-semibold">Portfolio</span>
            </a>
            <a 
              href="https://github.com/medicenalemon/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 py-4 px-6 rounded-2xl border hover:bg-gray-50 transition-all duration-200 hover:shadow-sm group"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              <Code2 size={22} className="text-gray-500 group-hover:text-gray-900 transition-colors" />
              <span className="text-[15px] font-semibold">GitHub</span>
            </a>
            <a 
              href="https://www.linkedin.com/in/mauricioalemon/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 py-4 px-6 rounded-2xl border hover:bg-gray-50 transition-all duration-200 hover:shadow-sm group"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              <Briefcase size={22} className="text-gray-500 group-hover:text-blue-700 transition-colors" />
              <span className="text-[15px] font-semibold">LinkedIn</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}
