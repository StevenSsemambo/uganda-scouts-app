// Shown briefly on every app load — while auth/session state is resolving,
// and for a minimum time so the brand actually registers rather than
// flashing past. Purely presentational.
export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-forest">
      <div className="flex flex-col items-center px-6 text-center animate-[fadeIn_0.4s_ease-out]">
        <img
          src="/logo.png"
          alt="Uganda Scouts Association"
          className="w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-lg animate-pulse"
        />
        <h1 className="font-display font-bold text-2xl md:text-3xl text-canvas mt-6 leading-tight">
          The Uganda Scouts Association
        </h1>
        <p className="text-canvas/70 text-sm md:text-base mt-2">
          The USA — Membership &amp; Registration App
        </p>
        <div className="flex gap-1.5 mt-8">
          <span className="w-2 h-2 rounded-full bg-ember animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 rounded-full bg-ember animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 rounded-full bg-ember animate-bounce" />
        </div>
      </div>
    </div>
  )
}
