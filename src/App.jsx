import React, { useState, useEffect } from 'react';
import {
  Clock,
  Users,
  FileText,
  UserPlus,
  LogIn,
  LogOut,
  CheckCircle,
  XCircle,
  Send,
  ClipboardList
} from 'lucide-react';

const API_URL = 'https://backend-asistdoc.onrender.com';
const LOGO_CLOUDINARY = 'https://res.cloudinary.com/vonizhny/image/upload/v1795063446/Proyecto_nuevo_1.png';

export default function App() {
  // === ESTADOS DE AUTENTICACIÓN Y ROL ===
  const [isAutenticado, setIsAutenticado] = useState(localStorage.getItem('auth') === 'true');
  const [rolUsuario, setRolUsuario] = useState(localStorage.getItem('role') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorLogin, setErrorLogin] = useState(false);

  // === ESTADOS GENERALES ===
  const [vistaActual, setVistaActual] = useState(
    localStorage.getItem('role') === 'Docente' ? 'mis-asistencias' : 'marcar'
  );
  const [horaActual, setHoraActual] = useState(new Date());

  // === ESTADOS DE MARCAJE (ADMIN) ===
  const [dni, setDni] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [marcajesHoy, setMarcajesHoy] = useState([]);

  // === ESTADOS DE GESTIÓN DE DOCENTES (ADMIN) ===
  const [docentesLista, setDocentesLista] = useState([]);
  const [nuevoDni, setNuevoDni] = useState('');
  const [nuevoNombres, setNuevoNombres] = useState('');
  const [nuevoApellidos, setNuevoApellidos] = useState('');
  const [nuevoPin, setNuevoPin] = useState('1234');
  const [mensajeDocente, setMensajeDocente] = useState(null);

  // === ESTADOS DE JUSTIFICACIONES (ADMIN Y DOCENTE) ===
  const [justificacionesAdmin, setJustificacionesAdmin] = useState([]);
  const [misAsistencias, setMisAsistencias] = useState([]);
  const [misJustificaciones, setMisJustificaciones] = useState([]);
  const [fechaFalta, setFechaFalta] = useState('');
  const [motivoFalta, setMotivoFalta] = useState('');
  const [mensajeJustificacion, setMensajeJustificacion] = useState(null);

  // Reloj en tiempo real
  useEffect(() => {
    const timer = setInterval(() => setHoraActual(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // === FUNCIONES DE CARGA DE DATOS ===
  const cargarAsistenciasHoy = async () => {
    try {
      const res = await fetch(`${API_URL}/api/asistencias-hoy`);
      if (res.ok) {
        const data = await res.json();
        setMarcajesHoy(data);
      }
    } catch (e) {
      console.error('Error al cargar asistencias de hoy');
    }
  };

  const cargarDocentes = async (token) => {
    try {
      const res = await fetch(`${API_URL}/api/docentes`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setDocentesLista(data);
      }
    } catch (e) {
      console.error('Error al cargar docentes');
    }
  };

  const cargarJustificacionesAdmin = async (token) => {
    try {
      const res = await fetch(`${API_URL}/api/justificaciones`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setJustificacionesAdmin(data);
      }
    } catch (e) {
      console.error('Error al cargar justificaciones');
    }
  };

  const cargarDatosDocente = async (token) => {
    try {
      const [resAsist, resJust] = await Promise.all([
        fetch(`${API_URL}/api/mis-asistencias`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json'
          }
        }),
        fetch(`${API_URL}/api/mis-justificaciones`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json'
          }
        })
      ]);

      if (resAsist.ok) {
        setMisAsistencias(await resAsist.json());
      }
      if (resJust.ok) {
        setMisJustificaciones(await resJust.json());
      }
    } catch (e) {
      console.error('Error al cargar datos del docente');
    }
  };

  // Cargar datos al iniciar sesión o recargar (F5)
  useEffect(() => {
    if (!isAutenticado) return;
    const token = localStorage.getItem('token');

    if (rolUsuario === 'Administrador') {
      cargarAsistenciasHoy();
      cargarDocentes(token);
      cargarJustificacionesAdmin(token);
    } else if (rolUsuario === 'Docente') {
      cargarDatosDocente(token);
    }
  }, [isAutenticado, rolUsuario]);

  // === 1. LOGIN ===
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorLogin(false);

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();

      if (response.ok && data.access_token) {
        const rol = data.role || 'Docente';
        setIsAutenticado(true);
        setRolUsuario(rol);
        localStorage.setItem('auth', 'true');
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('role', rol);
        setVistaActual(rol === 'Administrador' ? 'marcar' : 'mis-asistencias');
        setUsername('');
        setPassword('');
      } else {
        setErrorLogin(true);
      }
    } catch (error) {
      setErrorLogin(true);
    }
  };

  // === 2. LOGOUT ===
  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/api/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      });
    } catch (e) {
      // Continuar con limpieza local aunque falle la red
    }

    setIsAutenticado(false);
    setRolUsuario('');
    localStorage.removeItem('auth');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
  };

  // === 3. MARCAR ENTRADA / SALIDA (ADMIN) ===
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
          Accept: 'application/json'
        },
        body: JSON.stringify({ dni })
      });

      const data = await response.json();

      if (data.success) {
        const textoExito =
          data.tipo === 'salida'
            ? `Salida registrada para ${data.docente} a las ${data.hora_salida}`
            : `Entrada registrada para ${data.docente} (${data.estado}) a las ${data.hora}`;

        setMensaje({ tipo: 'exito', texto: textoExito });
        setDni('');
        await cargarAsistenciasHoy();
      } else {
        setMensaje({ tipo: 'error', texto: data.mensaje || 'Error al registrar.' });
        setDni('');
      }
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error de conexión con el servidor Laravel.' });
    } finally {
      setCargando(false);
    }
  };

  // === 4. AGREGAR DOCENTE (ADMIN) ===
  const handleAgregarDocente = async (e) => {
    e.preventDefault();
    if (!nuevoDni || !nuevoNombres || !nuevoApellidos || !nuevoPin) return;

    const token = localStorage.getItem('token');
    setMensajeDocente(null);

    try {
      const response = await fetch(`${API_URL}/api/docentes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          dni: nuevoDni,
          nombres: nuevoNombres,
          apellidos: nuevoApellidos,
          pin: nuevoPin
        })
      });

      const data = await response.json();

      if (response.ok) {
        setDocentesLista([...docentesLista, data]);
        setMensajeDocente({
          tipo: 'exito',
          texto: `Docente registrado. Puede iniciar sesión con Usuario: ${nuevoDni} y PIN: ${nuevoPin}.`
        });
        setNuevoDni('');
        setNuevoNombres('');
        setNuevoApellidos('');
        setNuevoPin('1234');
      } else {
        setMensajeDocente({ tipo: 'error', texto: data.message || 'Error al guardar docente.' });
      }
    } catch (error) {
      setMensajeDocente({ tipo: 'error', texto: 'Error de conexión con Laravel.' });
    }
  };

  // === 5. ENVIAR JUSTIFICACIÓN (DOCENTE) ===
  const handleEnviarJustificacion = async (e) => {
    e.preventDefault();
    if (!fechaFalta || !motivoFalta.trim()) return;

    const token = localStorage.getItem('token');
    setMensajeJustificacion(null);

    try {
      const response = await fetch(`${API_URL}/api/justificaciones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fecha_falta: fechaFalta,
          motivo: motivoFalta
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMensajeJustificacion({ tipo: 'exito', texto: 'Justificación enviada correctamente.' });
        setFechaFalta('');
        setMotivoFalta('');
        await cargarDatosDocente(token);
      } else {
        setMensajeJustificacion({
          tipo: 'error',
          texto: data.message || 'No se pudo enviar la justificación.'
        });
      }
    } catch (error) {
      setMensajeJustificacion({ tipo: 'error', texto: 'Error de conexión con el servidor.' });
    }
  };

  // === 6. APROBAR / RECHAZAR JUSTIFICACIÓN (ADMIN) ===
  const handleActualizarJustificacion = async (id, nuevoEstado) => {
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_URL}/api/justificaciones/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ estado: nuevoEstado })
      });

      if (response.ok) {
        await cargarJustificacionesAdmin(token);
      }
    } catch (error) {
      console.error('Error al actualizar estado de justificación');
    }
  };

  const formatoHora = horaActual.toLocaleTimeString('es-PE', { hour12: false });
  const formatoFecha = horaActual.toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const esTardanza = formatoHora > '07:45:00';

  // =========================================================================
  // PANTALLA DE LOGIN
  // =========================================================================
  if (!isAutenticado) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center mb-6">
            <img src={LOGO_CLOUDINARY} alt="Escudo Colegio 1270" className="w-20 h-20 object-contain mb-3" />
            <h1 className="text-2xl font-bold text-slate-800">Sistema AsistDoc</h1>
            <p className="text-sm text-slate-500">Colegio 1270 Juan Bautista</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Usuario (Admin o DNI de Docente)
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej: admin o 71234567"
                required
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contraseña / PIN
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {errorLogin && (
              <div className="bg-red-50 text-red-600 text-sm text-center py-2.5 px-3 rounded-xl border border-red-200">
                Credenciales incorrectas.
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition"
            >
              <LogIn className="w-5 h-5" />
              Ingresar al Sistema
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">IESTP Huaycán © 2026</p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // PANEL PRINCIPAL (ADMINISTRADOR O DOCENTE)
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col justify-between p-5">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <img src={LOGO_CLOUDINARY} alt="Logo" className="w-10 h-10 rounded-lg bg-white p-1 object-contain" />
            <div>
              <h2 className="font-bold text-lg leading-tight">AsistDoc</h2>
              <p className="text-xs text-slate-400">{rolUsuario}</p>
            </div>
          </div>

          <nav className="space-y-2">
            {rolUsuario === 'Administrador' ? (
              <>
                <button
                  onClick={() => setVistaActual('marcar')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                    vistaActual === 'marcar' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Marcaje de asistencia
                </button>

                <button
                  onClick={() => setVistaActual('docentes')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                    vistaActual === 'docentes' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Gestión de docentes
                </button>

                <button
                  onClick={() => setVistaActual('informes')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                    vistaActual === 'informes' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Informes de hoy
                </button>

                <button
                  onClick={() => setVistaActual('justificaciones-admin')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                    vistaActual === 'justificaciones-admin'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  Justificaciones
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setVistaActual('mis-asistencias')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                    vistaActual === 'mis-asistencias'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Mis Asistencias
                </button>

                <button
                  onClick={() => setVistaActual('mis-justificaciones')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                    vistaActual === 'mis-justificaciones'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  Enviar Justificación
                </button>
              </>
            )}
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="mt-8 w-full flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white py-2.5 rounded-xl text-sm font-medium transition"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {/* ================= VISTA ADMIN: MARCAJE ================= */}
        {rolUsuario === 'Administrador' && vistaActual === 'marcar' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Marcaje de Asistencia</h1>
                <p className="text-sm text-slate-500">Colegio 1270 Juan Bautista — Entrada y Salida</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-mono font-bold text-slate-800">{formatoHora}</p>
                <p className="text-xs text-slate-500 capitalize">{formatoFecha}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* TARJETA DE MARCAJE */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
                <div className="bg-blue-900 text-white rounded-xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-xs text-blue-200 capitalize">{formatoFecha}</p>
                    <p className="text-4xl font-mono font-bold mt-1">{formatoHora}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-blue-200">HORA LÍMITE DE INGRESO</p>
                    <p className="text-xl font-bold">07:45:00</p>
                    <span
                      className={`inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full ${
                        esTardanza ? 'bg-amber-500/30 text-amber-200' : 'bg-emerald-500/30 text-emerald-200'
                      }`}
                    >
                      {esTardanza ? 'Fuera de hora - Tardanza' : 'A tiempo'}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleMarcarAsistencia} className="space-y-4">
                  <label className="block text-sm font-medium text-slate-700">
                    Ingrese DNI del docente (1er marcaje = Entrada, 2do marcaje = Salida):
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      maxLength={8}
                      value={dni}
                      onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ej: 71234567"
                      className="flex-1 text-center text-2xl tracking-widest font-mono py-3 px-4 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-600"
                    />
                    <button
                      type="submit"
                      disabled={cargando}
                      className="bg-blue-900 hover:bg-blue-800 text-white font-semibold px-6 rounded-xl transition disabled:opacity-50"
                    >
                      {cargando ? 'Procesando...' : 'Marcar'}
                    </button>
                  </div>
                </form>

                {mensaje && (
                  <div
                    className={`mt-4 p-4 rounded-xl text-sm font-medium ${
                      mensaje.tipo === 'exito'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {mensaje.texto}
                  </div>
                )}
              </div>

              {/* MARCAJES DE HOY */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800">Marcajes de hoy</h3>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                    {marcajesHoy.length} registro(s)
                  </span>
                </div>

                {marcajesHoy.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">Aún no hay marcajes hoy.</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {marcajesHoy.map((m, i) => (
                      <div key={m.id || i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="font-semibold text-sm text-slate-800">{m.docente}</p>
                        <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                          <span>Entrada: {m.hora}</span>
                          <span>Salida: {m.hora_salida || 'Pendiente'}</span>
                        </div>
                        <span
                          className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${
                            m.estado === 'Tardanza'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {m.estado}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= VISTA ADMIN: GESTIÓN DE DOCENTES ================= */}
        {rolUsuario === 'Administrador' && vistaActual === 'docentes' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Gestión de Docentes</h1>
              <p className="text-sm text-slate-500">Al registrar un docente se crea su cuenta automáticamente.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  Registrar Nuevo
                </h3>

                <form onSubmit={handleAgregarDocente} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">DNI (Usuario)</label>
                    <input
                      type="text"
                      maxLength={8}
                      value={nuevoDni}
                      onChange={(e) => setNuevoDni(e.target.value.replace(/\D/g, ''))}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">NOMBRES</label>
                    <input
                      type="text"
                      value={nuevoNombres}
                      onChange={(e) => setNuevoNombres(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">APELLIDOS</label>
                    <input
                      type="text"
                      value={nuevoApellidos}
                      onChange={(e) => setNuevoApellidos(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">PIN DE ACCESO</label>
                    <input
                      type="text"
                      value={nuevoPin}
                      onChange={(e) => setNuevoPin(e.target.value)}
                      required
                      minLength={4}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition"
                  >
                    Guardar Docente
                  </button>
                </form>

                {mensajeDocente && (
                  <div
                    className={`mt-4 p-3 rounded-xl text-xs ${
                      mensajeDocente.tipo === 'exito'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {mensajeDocente.texto}
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4">Lista de Docentes Activos</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b text-xs text-slate-500 uppercase">
                        <th className="py-2">DNI</th>
                        <th className="py-2">Nombres y Apellidos</th>
                        <th className="py-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {docentesLista.map((d) => (
                        <tr key={d.id}>
                          <td className="py-3 font-mono text-blue-700">{d.dni}</td>
                          <td className="py-3 font-medium text-slate-800">
                            {d.nombres} {d.apellidos}
                          </td>
                          <td className="py-3">
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                              Activo
                            </span>
                          </td>
                        </tr>
                      ))}
                      {docentesLista.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-slate-400">
                            No hay docentes registrados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= VISTA ADMIN: INFORMES DE HOY ================= */}
        {rolUsuario === 'Administrador' && vistaActual === 'informes' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Informes e Históricos de Hoy</h1>
              <p className="text-sm text-slate-500">Control de entradas, salidas y tardanzas del día actual.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-slate-500 uppercase">
                    <th className="py-2">Fecha</th>
                    <th className="py-2">Docente</th>
                    <th className="py-2">Hora Entrada</th>
                    <th className="py-2">Hora Salida</th>
                    <th className="py-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {marcajesHoy.map((m, i) => (
                    <tr key={m.id || i}>
                      <td className="py-3 text-slate-600">{m.fecha}</td>
                      <td className="py-3 font-medium text-slate-800">{m.docente}</td>
                      <td className="py-3 font-mono text-blue-700">{m.hora}</td>
                      <td className="py-3 font-mono text-slate-700">{m.hora_salida || 'Pendiente'}</td>
                      <td className="py-3">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            m.estado === 'Tardanza'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {m.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {marcajesHoy.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No hay asistencias registradas hoy.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= VISTA ADMIN: JUSTIFICACIONES ================= */}
        {rolUsuario === 'Administrador' && vistaActual === 'justificaciones-admin' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Justificaciones de Docentes</h1>
              <p className="text-sm text-slate-500">Revisa, aprueba o rechaza las solicitudes enviadas.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-slate-500 uppercase">
                    <th className="py-2">Docente</th>
                    <th className="py-2">Fecha Falta</th>
                    <th className="py-2">Motivo</th>
                    <th className="py-2">Estado</th>
                    <th className="py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {justificacionesAdmin.map((j) => (
                    <tr key={j.id}>
                      <td className="py-3 font-medium text-slate-800">
                        {j.nombres} {j.apellidos}
                        <span className="block text-xs text-slate-400 font-mono">{j.dni}</span>
                      </td>
                      <td className="py-3 text-slate-600">{j.fecha_falta}</td>
                      <td className="py-3 text-slate-700 max-w-xs">{j.motivo}</td>
                      <td className="py-3">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            j.estado === 'Aprobada'
                              ? 'bg-emerald-100 text-emerald-700'
                              : j.estado === 'Rechazada'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {j.estado}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleActualizarJustificacion(j.id, 'Aprobada')}
                            className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleActualizarJustificacion(j.id, 'Rechazada')}
                            className="flex items-center gap-1 text-xs bg-red-600 hover:bg-red-700 text-white px-2.5 py-1.5 rounded-lg"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Rechazar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {justificacionesAdmin.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No hay justificaciones registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= VISTA DOCENTE: MIS ASISTENCIAS ================= */}
        {rolUsuario === 'Docente' && vistaActual === 'mis-asistencias' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Mis Asistencias</h1>
              <p className="text-sm text-slate-500">Historial personal de entradas y salidas.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-slate-500 uppercase">
                    <th className="py-2">Fecha</th>
                    <th className="py-2">Hora Entrada</th>
                    <th className="py-2">Hora Salida</th>
                    <th className="py-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {misAsistencias.map((a) => (
                    <tr key={a.id}>
                      <td className="py-3 font-medium text-slate-800">{a.fecha}</td>
                      <td className="py-3 font-mono text-blue-700">{a.hora_marca}</td>
                      <td className="py-3 font-mono text-slate-700">{a.hora_salida || 'Pendiente'}</td>
                      <td className="py-3">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            a.estado === 'Tardanza'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {a.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {misAsistencias.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        Aún no tienes asistencias registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= VISTA DOCENTE: ENVIAR JUSTIFICACIÓN ================= */}
        {rolUsuario === 'Docente' && vistaActual === 'mis-justificaciones' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Enviar Justificación</h1>
              <p className="text-sm text-slate-500">Registra el motivo de tu inasistencia o tardanza.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
              <form onSubmit={handleEnviarJustificacion} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de la falta</label>
                  <input
                    type="date"
                    value={fechaFalta}
                    onChange={(e) => setFechaFalta(e.target.value)}
                    required
                    className="w-full sm:w-64 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Motivo / Sustento</label>
                  <textarea
                    rows={3}
                    value={motivoFalta}
                    onChange={(e) => setMotivoFalta(e.target.value)}
                    placeholder="Explica brevemente el motivo de tu inasistencia..."
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition"
                >
                  <Send className="w-4 h-4" />
                  Enviar Justificación
                </button>
              </form>

              {mensajeJustificacion && (
                <div
                  className={`mt-4 p-3 rounded-xl text-sm ${
                    mensajeJustificacion.tipo === 'exito'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {mensajeJustificacion.texto}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 overflow-x-auto">
              <h3 className="font-bold text-slate-800 mb-4">Mis Solicitudes Enviadas</h3>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-slate-500 uppercase">
                    <th className="py-2">Fecha Falta</th>
                    <th className="py-2">Motivo</th>
                    <th className="py-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {misJustificaciones.map((j) => (
                    <tr key={j.id}>
                      <td className="py-3 text-slate-700">{j.fecha_falta}</td>
                      <td className="py-3 text-slate-700">{j.motivo}</td>
                      <td className="py-3">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            j.estado === 'Aprobada'
                              ? 'bg-emerald-100 text-emerald-700'
                              : j.estado === 'Rechazada'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {j.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {misJustificaciones.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-400">
                        No has enviado justificaciones todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}