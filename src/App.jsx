import React, { useState, useEffect } from 'react';
import { Clock, Users, FileText, UserPlus, LogIn } from 'lucide-react';

const API_URL = 'https://backend-asistdoc.onrender.com';
const LOGO_CLOUDINARY = 'PEGA_AQUI_TU_URL_DE_CLOUDINARY';

export default function App() {
  // === ESTADOS DE LOGIN ===
  const [isAutenticado, setIsAutenticado] = useState(localStorage.getItem('auth') === 'true');
  const [usuarioAdmin, setUsuarioAdmin] = useState('');
  const [passwordAdmin, setPasswordAdmin] = useState('');
  const [errorLogin, setErrorLogin] = useState(false);

  // === ESTADOS DEL SISTEMA ===
  const [vistaActual, setVistaActual] = useState('marcar');
  const [horaActual, setHoraActual] = useState(new Date());
  const [dni, setDni] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [marcajesHoy, setMarcajesHoy] = useState([]);

  const [docentesLista, setDocentesLista] = useState([]);
  const [nuevoDni, setNuevoDni] = useState('');
  const [nuevoNombres, setNuevoNombres] = useState('');
  const [nuevoApellidos, setNuevoApellidos] = useState('');
  const [mensajeDocente, setMensajeDocente] = useState(null);

  // Reloj en tiempo real
  useEffect(() => {
    const timer = setInterval(() => setHoraActual(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // === 1. CARGAR DATOS REALES AL ENTRAR (SOBREVIVE AL F5) ===
  useEffect(() => {
    const cargarDatosDesdeLaravel = async () => {
      const token = localStorage.getItem('token');

      // Cargar Asistencias (Historial)
      try {
        const resAsist = await fetch(`${API_URL}/api/asistencias-hoy`);
        if (resAsist.ok) {
          const dataAsist = await resAsist.json();
          setMarcajesHoy(dataAsist);
        }
      } catch (e) { console.error("Error al cargar asistencias"); }

      // Cargar Docentes desde MySQL (Ruta protegida)
      try {
        const resDoc = await fetch(`${API_URL}/api/docentes`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        if (resDoc.ok) {
          const dataDoc = await resDoc.json();
          setDocentesLista(dataDoc);
        }
      } catch (e) { console.error("Error al cargar docentes"); }
    };

    if (isAutenticado) {
      cargarDatosDesdeLaravel();
    }
  }, [isAutenticado]);

  // === 2. LOGIN REAL CON LA BASE DE DATOS ===
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ username: usuarioAdmin, password: passwordAdmin })
      });
      const data = await response.json();

      if (response.ok && data.access_token) {
        setIsAutenticado(true);
        localStorage.setItem('auth', 'true');
        localStorage.setItem('token', data.access_token);
        setErrorLogin(false);
      } else {
        setErrorLogin(true);
      }
    } catch (error) {
      setErrorLogin(true);
    }
  };

  const handleLogout = () => {
    setIsAutenticado(false);
    localStorage.removeItem('auth');
    localStorage.removeItem('token');
  };

  // === 3. MARCAR ASISTENCIA (CONEXIÓN CON LARAVEL) ===
  const handleMarcarAsistencia = async (e) => {
    e.preventDefault();

    if (dni.length !== 8) {
      setMensaje({ tipo: 'error', texto: 'El DNI debe tener exactamente 8 dígitos.' });
      return;
    }

    setCargando(true);
    setMensaje(null);

    try {
      const response = await fetch(`${API_URL}/api/asistencia/marcar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ dni })
      });

      const data = await response.json();

      if (data.success) {
        const nuevoMarcaje = { docente: data.docente, hora: data.hora, estado: data.estado };
        setMarcajesHoy([nuevoMarcaje, ...marcajesHoy]);
        setMensaje({ tipo: 'exito', texto: `Tu marcaje se registró como: ${data.estado}` });
        setDni('');
      } else {
        setMensaje({ tipo: 'error', texto: data.mensaje || 'Error al registrar' });
        setDni('');
      }
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error de conexión con el servidor Laravel.' });
    } finally {
      setCargando(false);
    }
  };

  // === 4. AGREGAR DOCENTES DIRECTO A MYSQL ===
  const handleAgregarDocente = async (e) => {
    e.preventDefault();
    if (!nuevoDni || !nuevoNombres || !nuevoApellidos) return;

    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_URL}/api/docentes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dni: nuevoDni,
          nombres: nuevoNombres,
          apellidos: nuevoApellidos,
          pin: '1234'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setDocentesLista([...docentesLista, data]);
        setMensajeDocente({ tipo: 'exito', texto: `Docente guardado en la Base de Datos.` });
        setNuevoDni(''); setNuevoNombres(''); setNuevoApellidos('');
      } else {
        setMensajeDocente({ tipo: 'error', texto: data.message || 'Error al guardar.' });
      }
    } catch (error) {
      setMensajeDocente({ tipo: 'error', texto: 'Error de conexión con Laravel.' });
    }
  };

  const formatoHora = horaActual.toLocaleTimeString('es-PE', { hour12: false });
  const formatoFecha = horaActual.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const esTardanza = formatoHora > '07:45:00';

  // 🚀 EXPORTAR A EXCEL (CSV Nativo)
  const exportarExcel = () => {
    if (marcajesHoy.length === 0) return alert("No hay datos para exportar.");
    const encabezados = "Fecha,Docente,Hora de Marcaje,Estado\n";
    const filas = marcajesHoy.map(m => `${new Date().toLocaleDateString()},${m.docente},${m.hora},${m.estado}`).join("\n");
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + encabezados + filas;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Reporte_Asistencias.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 🚀 EXPORTAR A PDF (Impresión limpia)
  const exportarPDF = () => {
    window.print();
  };

  // === VISTA DE LOGIN ===
  if (!isAutenticado) {
    return (
      <div className="flex h-screen bg-slate-100 items-center justify-center font-sans">
        <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
          <div className="flex flex-col items-center mb-8">
            <img
              src={LOGO_CLOUDINARY}
              alt="Escudo Colegio 1270 Juan El Bautista"
              className="w-20 h-20 object-contain mb-4"
            />
            <h2 className="text-2xl font-bold text-slate-800">Sistema AsistDoc</h2>
            <p className="text-slate-500 text-sm">Colegio 1270 Juan Bautista</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-2">Usuario</label>
              <input type="text" value={usuarioAdmin} onChange={(e) => setUsuarioAdmin(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600" placeholder="Ingrese su usuario" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-2">Contraseña</label>
              <input type="password" value={passwordAdmin} onChange={(e) => setPasswordAdmin(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600" placeholder="••••••" />
            </div>
            {errorLogin && <p className="text-rose-500 text-sm font-medium text-center bg-rose-50 p-2 rounded-lg">Credenciales incorrectas.</p>}
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-colors shadow-md flex justify-center items-center gap-2">
              <LogIn size={20} /> Ingresar al Sistema
            </button>
          </form>
          <p className="text-center text-xs text-slate-400 mt-8">IESTP Huaycán © 2026</p>
        </div>
      </div>
    );
  }

  // === VISTA PRINCIPAL (SISTEMA) ===
  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans">
      <aside className="w-64 bg-[#1e293b] text-white flex flex-col justify-between print:hidden">
        <div>
          <div className="p-6 flex items-center gap-4 border-b border-slate-700/50">
            <img
              src={LOGO_CLOUDINARY}
              alt="Escudo Colegio 1270 Juan El Bautista"
              className="w-10 h-10 object-contain rounded-lg bg-white p-1"
            />
            <div>
              <h1 className="font-bold text-lg leading-tight">AsistDoc</h1>
              <p className="text-[11px] text-slate-400">Asistencia Docente</p>
            </div>
          </div>
          <nav className="p-4 space-y-2">
            <button onClick={() => setVistaActual('marcar')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${ vistaActual === 'marcar' ? 'bg-slate-700/80 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Clock size={20} /> Marcaje de asistencia
            </button>
            <button onClick={() => setVistaActual('docentes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${ vistaActual === 'docentes' ? 'bg-slate-700/80 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Users size={20} /> Gestión de docentes
            </button>
            <button onClick={() => setVistaActual('informes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${ vistaActual === 'informes' ? 'bg-slate-700/80 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <FileText size={20} /> Informes e históricos
            </button>
          </nav>
        </div>
        <button onClick={handleLogout} className="m-4 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white p-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
          <LogIn size={16} className="rotate-180" /> Cerrar Sesión
        </button>
      </aside>

      <main className="flex-1 p-10 overflow-y-auto print:p-0 print:bg-white">
        {vistaActual === 'marcar' && (
          <div className="print:hidden">
            <header className="flex justify-between items-start mb-8">
              <div><h2 className="text-3xl font-bold text-slate-800">Marcaje de asistencia</h2><p className="text-slate-500 mt-1">Colegio 1270 Juan Bautista</p></div>
              <div className="text-right"><div className="text-3xl font-bold text-blue-900 tracking-tight">{formatoHora}</div><div className="text-sm text-slate-500 capitalize">{formatoFecha}</div></div>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-[#243c74] text-white p-8 flex justify-between items-center">
                    <div><p className="text-blue-200 text-sm mb-2 capitalize">{formatoFecha}</p><div className="text-6xl font-bold tracking-tight">{formatoHora}</div></div>
                    <div className="text-right"><p className="text-blue-200 text-xs font-bold tracking-widest uppercase mb-2">Hora límite</p><div className="text-4xl font-bold mb-3">07:45:00</div><span className={`text-xs px-3 py-1.5 rounded-full font-medium ${esTardanza ? 'bg-rose-500/20 text-rose-200 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'}`}>{esTardanza ? 'Fuera de hora - TARDANZA' : 'A tiempo - ASISTENCIA'}</span></div>
                  </div>
                  <div className="p-8">
                    <form onSubmit={handleMarcarAsistencia}>
                      <label className="block text-sm font-medium text-slate-700 mb-4">Ingrese su DNI:</label>
                      <div className="flex gap-4">
                        <input type="text" maxLength="8" value={dni} onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))} className="flex-1 bg-white border-2 border-slate-200 rounded-xl px-6 py-4 text-3xl font-mono tracking-[0.5em] text-center text-slate-800 focus:outline-none focus:border-blue-600" autoFocus />
                        <button type="submit" disabled={cargando} className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-12 rounded-xl text-lg shadow-md disabled:opacity-50">{cargando ? '...' : 'Marcar'}</button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                {mensaje ? (
                  <div className={`p-8 rounded-2xl border flex flex-col items-center justify-center text-center ${mensaje.tipo === 'error' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                    <p className="font-bold text-xl mb-2">{mensaje.tipo === 'error' ? 'Error' : 'Éxito'}</p><p className="text-sm">{mensaje.texto}</p>
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl border bg-slate-50 border-slate-100 flex items-center justify-center text-center text-slate-400 min-h-[140px]"><p className="text-sm">Esperando ingreso...</p></div>
                )}
              </div>
            </div>
          </div>
        )}

        {vistaActual === 'docentes' && (
          <div className="print:hidden">
            <header className="mb-8"><h2 className="text-3xl font-bold text-slate-800">Gestión de Docentes</h2></header>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><UserPlus size={20} className="text-blue-600" /> Registrar Nuevo</h3>
                <form onSubmit={handleAgregarDocente} className="space-y-4">
                  <div><label className="block text-xs font-semibold text-slate-500 mb-1">DNI</label><input type="text" maxLength="8" value={nuevoDni} onChange={(e) => setNuevoDni(e.target.value.replace(/\D/g, ''))} className="w-full border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-600" /></div>
                  <div><label className="block text-xs font-semibold text-slate-500 mb-1">NOMBRES</label><input type="text" value={nuevoNombres} onChange={(e) => setNuevoNombres(e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-600" /></div>
                  <div><label className="block text-xs font-semibold text-slate-500 mb-1">APELLIDOS</label><input type="text" value={nuevoApellidos} onChange={(e) => setNuevoApellidos(e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-600" /></div>
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors mt-2">Guardar Docente</button>
                </form>
                {mensajeDocente && <div className={`mt-4 p-3 rounded-lg text-sm ${mensajeDocente.tipo === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{mensajeDocente.texto}</div>}
              </div>
              <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <h3 className="font-bold text-slate-800 mb-6">Lista de Docentes Activos</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                      <tr><th className="p-4">DNI</th><th className="p-4">Nombres y Apellidos</th><th className="p-4 text-center">Estado</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {docentesLista.map((doc) => (
                        <tr key={doc.id}>
                          <td className="p-4 font-mono font-medium text-blue-600">{doc.dni}</td>
                          <td className="p-4 font-medium text-slate-700">{doc.nombres} {doc.apellidos}</td>
                          <td className="p-4 text-center"><span className="bg-emerald-100 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-medium">Activo</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {vistaActual === 'informes' && (
          <div>
            <header className="mb-8 print:hidden">
              <h2 className="text-3xl font-bold text-slate-800">Informes e Históricos</h2>
              <p className="text-slate-500 mt-1">Reportes de asistencia y tardanzas</p>
            </header>

            <div className="hidden print:block mb-8 text-center">
              <h1 className="text-2xl font-bold uppercase text-slate-800">Colegio 1270 Juan Bautista</h1>
              <h2 className="text-xl font-semibold text-slate-600">Reporte Oficial de Asistencia Docente</h2>
              <p className="text-sm text-slate-500 mt-2">Generado el: {new Date().toLocaleString()}</p>
              <hr className="mt-4 border-slate-300" />
            </div>

            <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm print:border-none print:shadow-none print:p-0">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-100 pb-6 mb-6 print:hidden">
                <div><h3 className="font-bold text-slate-800">Resumen General de Asistencias</h3></div>
                <div className="flex gap-3">
                  <button onClick={exportarPDF} className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
                    <FileText size={16} /> Exportar PDF
                  </button>
                  <button onClick={exportarExcel} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
                    <FileText size={16} /> Exportar Excel
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold print:bg-slate-200 print:text-black">
                    <tr><th className="p-4">Fecha</th><th className="p-4">Docente</th><th className="p-4">Hora de Marcaje</th><th className="p-4 text-center">Estado</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                    {marcajesHoy.length === 0 ? (
                      <tr><td colSpan="4" className="text-center text-slate-400 py-10">No hay registros históricos para mostrar hoy.</td></tr>
                    ) : (
                      marcajesHoy.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-4 text-slate-600">{new Date().toLocaleDateString()}</td>
                          <td className="p-4 font-semibold text-slate-700">{m.docente}</td>
                          <td className="p-4 font-mono text-blue-600">{m.hora}</td>
                          <td className="p-4 text-center">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${m.estado === 'Asistió' ? 'bg-emerald-100 text-emerald-700 print:text-black print:bg-transparent' : 'bg-rose-100 text-rose-700 print:text-black print:bg-transparent'}`}>{m.estado}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}