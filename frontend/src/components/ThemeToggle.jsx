export default function ThemeToggle({theme, setTheme}) {
  return (
    <button
      onClick={()=>setTheme(t => t==='light' ? 'dark':'light')}
      className="badge"
      title="Toggle theme"
    >
      {theme==='light' ? '🌙 Dark' : '☀️ Light'}
    </button>
  );
}
