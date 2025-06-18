import { CardPlayer } from "./CardPlayer";

export const TutorialCard = ({ tutorial }) => {
  const { titulo, subtitulo, tipos, youtubeId } = tutorial;

  const formatTipos = (text) => {
    if (!text) return "General";
    return text.includes("_") ? text.split("_").join(" → ") : text;
  };

  return (
    <div
      className="group flex flex-col h-full rounded-xl overflow-hidden 
                 transition-all duration-300 ease-out transform hover:-translate-y-1
                 
                 // ✅ ESTILOS PARA TEMA CLARO
                 bg-white border-2 border-slate-200 
                 hover:border-blue-400 hover:shadow-xl
                 
                 // ✅ ESTILOS PARA TEMA OSCURO
                 dark:bg-principal dark:border-linea/50 
                 dark:hover:border-azul-gradient 
                 dark:hover:shadow-[0_10px_30px_rgba(51,51,234,0.2),0_0_15px_rgba(51,51,234,0.8)]"
    >
      <div className="relative overflow-hidden rounded-t-lg">
        <CardPlayer videoId={youtubeId} />
      </div>
      <div className="p-5 flex flex-col flex-grow space-y-2.5">
        <div className="flex items-start">
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide
                         bg-gradient-to-r from-azul-gradient to-morado-gradient text-white"
          >
            {formatTipos(tipos)}
          </span>
        </div>
        <h2
          className="font-bold text-lg leading-tight 
                     bg-clip-text text-transparent bg-gradient-to-r from-azul-gradient to-morado-gradient
                     group-hover:brightness-125 transition-all duration-200"
        >
          {titulo}
        </h2>
        {/* ✅ CORREGIDO: Texto de la descripción adaptado */}
        <p className="text-slate-600 dark:text-white text-sm leading-relaxed line-clamp-3 flex-grow">
          {subtitulo}
        </p>
        <div className="pt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div
            className="w-10 h-0.5 rounded-full
                         bg-gradient-to-r from-azul-gradient to-morado-gradient"
          />
        </div>
      </div>
    </div>
  );
};