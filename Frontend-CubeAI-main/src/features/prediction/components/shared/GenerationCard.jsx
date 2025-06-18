import { DownloadSimple, Trash, Cube } from "@phosphor-icons/react";
import { useTranslation } from 'react-i18next';

const DownloadButton = ({ download }) => {
  const { t } = useTranslation();
  const handleDownload = (e) => {
    e.stopPropagation(); 
    const link = document.createElement("a");
    link.href = download.url;
    link.download = `${download.format.toLowerCase()}_model.${download.format.toLowerCase()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-azul-gradient to-morado-gradient text-white rounded-full shadow-lg hover:shadow-xl transition-all text-xs"
      aria-label={`${t('visualizer_page.card.download_label')} ${download.format}`}
    >
      <DownloadSimple size={16} weight="bold" />
      {download.format}
    </button>
  );
};

export const GenerationCard = ({ generation, formatDate, openModal, open3DViewer }) => {
  const { t } = useTranslation();
  // Assuming 'error_message' might be the field name for errors. Adapt if different.
  const { previewImageUrl, downloads, status, error_message, modelUrl } = generation;

  const handleCardClick = () => {
    if (modelUrl) {
      open3DViewer(generation);
    }
  };

  const isGsUrl = (url) => url && url.startsWith('gs://');

  return (
    <div 
      onClick={handleCardClick}
      className="relative w-full h-[220px] rounded-2xl overflow-hidden shadow-lg group cursor-pointer 
                 bg-gray-200 dark:bg-principal 
                 border-2 border-transparent hover:border-morado-gradient transition-all duration-300"
    >
      {previewImageUrl && !isGsUrl(previewImageUrl) ? (
        <img 
          src={previewImageUrl} 
          alt={`Previsualización de ${generation.generation_name}`}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-400 p-4 text-center">
            <Cube size={40} className="mb-2 opacity-50"/>
            {isGsUrl(previewImageUrl) ? (
                 <span className="text-xs opacity-70 mt-1">{t('visualizer_page.card.preview_gs_url', 'Preview not directly viewable (GS URL)')}</span>
            ) : (
                 <span className="text-sm font-medium">{t('visualizer_page.card.preview_unavailable', 'Preview Unavailable')}</span>
            )}
            {modelUrl && <span className="text-xs opacity-70 mt-1">{t('visualizer_page.card.click_to_view', 'Click to view details')}</span>}
        </div>
      )}
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300"></div>

      <div className="absolute inset-0 flex flex-col justify-end p-3 text-white">
        <h3 className="text-base font-bold truncate drop-shadow-md" title={generation.generation_name}>{generation.generation_name}</h3>

        {status && (
          <p className={`text-xs drop-shadow-sm font-semibold ${
            status === 'FAILURE' ? 'text-red-400' : status === 'SUCCESS' ? 'text-green-400' : 'text-gray-300'
          }`}>
            {t('visualizer_page.card.status_label', 'Status')}:{' '}
            {status === 'FAILURE' ? t('visualizer_page.card.status_failed', 'Failed') :
             status === 'SUCCESS' ? t('visualizer_page.card.status_completed', 'Completed') :
             status}
          </p>
        )}

        {status === 'FAILURE' && error_message && (
          <p className="text-xs text-red-300 truncate drop-shadow-sm" title={error_message}>
            {t('visualizer_page.card.error_label', 'Error')}: {error_message}
          </p>
        )}

        {modelUrl && isGsUrl(modelUrl) && (
            <p className="text-xs text-amber-400 drop-shadow-sm truncate" title={modelUrl}>
                {t('visualizer_page.card.model_gs_url_notice', 'Model at GS Path (may not open directly)')}
            </p>
        )}

        <p className="text-xs text-gray-300 mb-2 drop-shadow-sm">
          {formatDate(generation.timestamp)}
        </p>

        <div className="flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex gap-2">
            {downloads && downloads.map(d => (
              <DownloadButton key={d.format} download={d} />
            ))}
          </div>
          <button
            className="p-2 bg-red-600 rounded-full hover:bg-red-700 transition-colors shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              openModal(generation);
            }}
            aria-label={t('visualizer_page.card.delete_label')}
          >
            <Trash size={16} color="white" weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
};