import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Controles de paginacion para los listados que el servidor pagina
 * (aportaciones, mantenimientos y revisiones).
 *
 * Recibe la respuesta de Laravel tal cual: { current_page, last_page, total,
 * per_page, from, to }.
 */
const Paginacion = ({ meta, onCambiarPagina }) => {
  if (!meta || meta.total === 0) return null;

  const { current_page: actual, last_page: ultima, total, from, to } = meta;

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500">
        Mostrando <span className="font-bold text-slate-700">{from}</span>–
        <span className="font-bold text-slate-700">{to}</span> de{' '}
        <span className="font-bold text-slate-700">{total}</span> registros
      </p>

      {ultima > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onCambiarPagina(actual - 1)}
            disabled={actual <= 1}
            className="flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
          </button>

          <span className="px-2 text-xs font-bold text-slate-600">
            Página {actual} de {ultima}
          </span>

          <button
            type="button"
            onClick={() => onCambiarPagina(actual + 1)}
            disabled={actual >= ultima}
            className="flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente <ChevronRight className="ml-1 h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Paginacion;
