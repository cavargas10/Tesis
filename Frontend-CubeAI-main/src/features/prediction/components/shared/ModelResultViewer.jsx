import { Suspense, useState, useEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Html } from "@react-three/drei";
import { DownloadSimple, ArrowsClockwise, Aperture, Image as ImageIcon, X } from "@phosphor-icons/react";
import { HDREnvironment } from "./HDREnvironment";
import { ModelViewer } from "./ModelViewer";
import { ModalBase } from "../../../../components/modals/ModalBase";
import { viewerConfig } from "../../config/viewer.config";
import { useTranslation } from "react-i18next";

// --- ControlButton adaptado para ambos temas ---
const ControlButton = ({ onClick, title, children, active }) => (
  <button
    onClick={onClick}
    className={`p-2 rounded-xl transition-all flex items-center gap-2
      ${active
        ? "bg-gradient-to-r from-azul-gradient to-morado-gradient text-white shadow-md"
        : "bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-gradient-to-r dark:hover:from-azul-gradient/50 dark:hover:to-morado-gradient/50 text-gray-700 dark:text-gray-300"
      }`}
    title={title}
  >
    {children}
  </button>
);

// --- Fallback de carga adaptado ---
const ModelLoadingFallback = () => {
  const { t } = useTranslation();
  return (
    <Html center zIndexRange={[100, 0]}>
      <div className="text-center p-4 bg-white/90 dark:bg-principal/90 rounded-2xl backdrop-blur-sm shadow-xl">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-morado-gradient mx-auto mb-3"></div>
        <p className="text-sm text-gray-800 dark:text-white font-medium">{t('model_viewer.loading_model')}</p>
      </div>
    </Html>
  );
};

const CanvasInitializingFallback = () => <Html center></Html>;

const CanvasCaptureHandler = ({ onCaptureReady }) => {
  const { gl, scene, camera } = useThree();
  const captured = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (gl.domElement && !captured.current) {
        gl.render(scene, camera);
        try {
          const dataURL = gl.domElement.toDataURL("image/png");
          if (dataURL.length > 100) { 
            onCaptureReady(dataURL);
            captured.current = true;
          }
        } catch (e) {
            console.error("Error capturing canvas:", e);
        }
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [gl, onCaptureReady, scene, camera]);

  return null;
};

export const ModelResultViewer = ({
  modelUrl,
  textureUrl,
  onFirstLoad,
  children,
  isCollapsed,
  downloadFilename = viewerConfig.default.downloadFilename,
  controls = viewerConfig.default.controls,
  initialCameraPosition = viewerConfig.default.initialCameraPosition,
  orbitControlsConfig = viewerConfig.default.orbitControlsConfig,
  gridPosition = viewerConfig.default.gridPosition,
}) => {
  const { t } = useTranslation();
  const [showWireframe, setShowWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showTexture, setShowTexture] = useState(true);
  const [internalTexturePreview, setInternalTexturePreview] = useState(null);
  const [isTextureZoomed, setIsTextureZoomed] = useState(false);
  const isResultReady = Boolean(modelUrl);
  const textureToPreview = textureUrl || internalTexturePreview;

  useEffect(() => {
    setInternalTexturePreview(null);
    setShowTexture(controls.texture);
    setShowWireframe(false); 
    setAutoRotate(true); 
  }, [modelUrl, controls.texture]);

  return (
    <div className="w-full h-full bg-gray-100 dark:bg-principal rounded-3xl relative overflow-hidden">
      {/* --- Estado de Espera --- */}
      {!isResultReady && (
        <div className="absolute inset-0 bg-white/50 dark:bg-black/30 backdrop-blur-sm z-20 flex items-center justify-center rounded-3xl">
          <div className="text-center p-6 rounded-2xl bg-white/80 dark:bg-principal/80">
            <h3 className="text-2xl font-semibold mb-2 text-gray-800 dark:text-white">{t('model_viewer.waiting_title')}</h3>
            <p className="text-gray-600 dark:text-gray-300">{t('model_viewer.waiting_subtitle')}</p>
          </div>
        </div>
      )}

      <div className={`relative h-full ${children && isResultReady ? "grid xl:grid-cols-6" : ""}`}>
        {isResultReady && children && (
          // Esta sección no la estamos usando por ahora, pero la dejo preparada por si acaso
          <div className="xl:col-span-2 xl:border-r xl:border-gray-200 dark:xl:border-linea flex flex-col items-center p-4">
            {children}
          </div>
        )}
        <div className={`${children && isResultReady ? "xl:col-span-4" : "col-span-full"} h-full relative ${children && isResultReady ? "border-t xl:border-t-0 xl:border-gray-200 dark:xl:border-linea" : ""}`}>
          {isResultReady && (
            // --- Barra de Controles ---
            <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2 bg-white/80 dark:bg-principal/90 p-3 rounded-2xl backdrop-blur">
              {controls.wireframe && (
                <ControlButton onClick={() => setShowWireframe(!showWireframe)} title={t('model_viewer.controls.wireframe')} active={showWireframe}>
                  <Aperture size={20} />
                  <span className="text-sm">{t('model_viewer.controls.wireframe')}</span>
                </ControlButton>
              )}
              {controls.rotate && (
                <ControlButton onClick={() => setAutoRotate(!autoRotate)} title={t('model_viewer.controls.rotate')} active={autoRotate}>
                  <ArrowsClockwise size={20} />
                  <span className="text-sm">{t('model_viewer.controls.rotate')}</span>
                </ControlButton>
              )}
              {controls.texture && (
                <ControlButton onClick={() => setShowTexture(!showTexture)} title={t('model_viewer.controls.texture')} active={showTexture}>
                  <ImageIcon size={20} />
                  <span className="text-sm">{t('model_viewer.controls.texture')}</span>
                </ControlButton>
              )}
              {controls.download && modelUrl && (
                <div className="flex gap-2 items-center">
                  <div className="h-6 w-px bg-gray-300 dark:bg-white/20 rounded-full" />
                  <a href={modelUrl} download={downloadFilename} className="p-2 bg-gradient-to-r from-azul-gradient to-morado-gradient text-white rounded-xl flex items-center gap-2 transition-all hover:shadow-lg hover:scale-105">
                    <DownloadSimple size={20} />
                    <span className="text-sm">GLB</span>
                  </a>
                </div>
              )}
            </div>
          )}
          {isResultReady && controls.texture && textureToPreview && (
            // --- Previsualización de Textura ---
            <div className="absolute bottom-4 left-4 z-10 cursor-pointer" onClick={() => setIsTextureZoomed(true)}>
              <div className="bg-white/80 dark:bg-fondologin/90 p-3 rounded-2xl group hover:bg-gray-200 dark:hover:bg-principal transition-colors">
                <img src={textureToPreview} alt="Vista previa de textura" className="w-16 h-16 object-cover rounded-xl group-hover:opacity-90 transition-opacity"/>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block text-center">{t('model_viewer.texture_preview')}</span>
              </div>
            </div>
          )}
          <Canvas gl={{ preserveDrawingBuffer: true }} camera={{ position: initialCameraPosition, fov: 50 }} className={`h-full rounded-3xl ${!isResultReady ? "opacity-40" : "opacity-100 transition-opacity duration-300"}`}>
            <Suspense fallback={<CanvasInitializingFallback />}>
              <Grid position={gridPosition} args={[15, 15]} cellSize={0.5} cellThickness={1} cellColor="#6f6f6f" sectionSize={2.5} sectionThickness={1.5} sectionColor="#9d4bff" fadeDistance={25} fadeStrength={1} infiniteGrid />
              <HDREnvironment />
              <OrbitControls minDistance={orbitControlsConfig.minDistance} maxDistance={orbitControlsConfig.maxDistance} autoRotate={isResultReady && autoRotate && controls.rotate} autoRotateSpeed={orbitControlsConfig.autoRotateSpeed} enablePan={true} enabled={isResultReady} />
              {isResultReady && (
                <Suspense fallback={<ModelLoadingFallback />}>
                  <ModelViewer key={modelUrl} url={modelUrl} showWireframe={showWireframe} showTexture={showTexture && controls.texture} onTextureLoad={setInternalTexturePreview} />
                  {onFirstLoad && <CanvasCaptureHandler onCaptureReady={onFirstLoad} />}
                </Suspense>
              )}
            </Suspense>
          </Canvas>
          {/* El modal para ampliar la textura ya usa fondos y botones adaptables, no necesita cambios */}
          <ModalBase isOpen={isTextureZoomed} onClose={() => setIsTextureZoomed(false)}>
            <div className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-300 ease-in-out ${isCollapsed ? "sm:pl-[80px]" : "md:pl-[267px] 2xl:pl-[300px]"}`} style={{ paddingTop: '80px', paddingBottom: '20px' }}>
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsTextureZoomed(false)} />
              <div className="relative bg-white dark:bg-principal rounded-2xl p-4 shadow-2xl">
                <div className="w-[500px] h-[500px] flex items-center justify-center relative">
                  <img src={textureToPreview} alt="Vista completa de textura" className="max-w-full max-h-full object-contain rounded-xl" />
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <a href={textureToPreview} download="textura.png" className="px-4 py-2 bg-gradient-to-r from-azul-gradient to-morado-gradient text-white rounded-full flex items-center gap-2 transition-all hover:shadow-lg hover:scale-105 shadow-xl backdrop-blur-sm">
                      <DownloadSimple size={18} />
                      <span className="text-sm font-medium">{t('model_viewer.texture_download')}</span>
                    </a>
                  </div>
                </div>
                <button onClick={() => setIsTextureZoomed(false)} className="absolute -top-3 -right-3 p-2 bg-red-500 hover:bg-red-600 rounded-full transition-colors text-white shadow-lg z-10" aria-label="Cerrar vista de textura">
                  <X size={20} />
                </button>
              </div>
            </div>
          </ModalBase>
        </div>
      </div>
    </div>
  );
};