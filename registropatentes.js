import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

// --- FIREBASE CONFIGURATION ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// NOTE: For a real-world application, a more robust authentication system
// with a secure backend is required. This is a simple, client-side example.
const USER_PASSWORD = "condominio123";
const ADMIN_PASSWORD = "admin456";

// Datos para las listas desplegables
const vehicleData = {
    'Toyota': ['Corolla', 'Camry', 'Rav4', 'Hilux', 'Yaris'],
    'Ford': ['Focus', 'Fiesta', 'Mustang', 'F-150', 'Escape'],
    'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot'],
    'Nissan': ['Sentra', 'Altima', 'Titan', 'Rogue'],
    'Chevrolet': ['Cruze', 'Malibu', 'Silverado', 'Equinox'],
    'Volkswagen': ['Jetta', 'Passat', 'Tiguan', 'Golf'],
    'Kia': ['Rio', 'Sportage', 'Seltos', 'K5'],
    'Hyundai': ['Elantra', 'Tucson', 'Santa Fe', 'Sonata'],
    'Mazda': ['Mazda3', 'Mazda6', 'CX-5', 'CX-9'],
    'Subaru': ['Impreza', 'Outback', 'Forester', 'Crosstrek'],
    'Mercedes-Benz': ['Clase C', 'Clase E', 'Clase S', 'GLE'],
    'BMW': ['Serie 3', 'Serie 5', 'X3', 'X5'],
    'Audi': ['A4', 'A6', 'Q5', 'Q7'],
    'Jeep': ['Wrangler', 'Grand Cherokee', 'Compass', 'Cherokee'],
    'Ram': ['1500', '2500', '3500'],
    'GMC': ['Sierra 1500', 'Acadia', 'Terrain'],
    'Cadillac': ['Escalade', 'XT5', 'XT4'],
    'Dodge': ['Charger', 'Challenger', 'Durango'],
    'Chrysler': ['300', 'Pacifica'],
    'Mitsubishi': ['Outlander', 'L200', 'Mirage'],
    'Volvo': ['S60', 'XC60', 'XC90'],
    'Acura': ['MDX', 'TLX'],
    'Lexus': ['RX', 'NX'],
};

const commonColors = [
    'Blanco', 'Negro', 'Gris', 'Plata', 'Rojo', 'Azul', 'Verde', 'Amarillo', 'Naranja', 'Marrón', 'Púrpura'
];

const useTypes = [
    'Personal', 'Invitado', 'Agua', 'Trabajos'
];

// Función para ordenar alfabéticamente los datos
const sortDataAlphabetically = (data) => {
    // Ordenar las marcas
    const sortedMakes = Object.keys(data).sort();
    const sortedData = {};
    sortedMakes.forEach(make => {
        // Ordenar los modelos para cada marca
        sortedData[make] = data[make].sort();
    });
    return sortedData;
};

const sortedVehicleData = sortDataAlphabetically(vehicleData);
const sortedCommonColors = commonColors.sort();
const sortedUseTypes = useTypes.sort();

// Componente para la pantalla de Login/Auth
const AuthScreen = ({ onLogin }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === USER_PASSWORD) {
            onLogin('user');
        } else if (password === ADMIN_PASSWORD) {
            onLogin('admin');
        } else {
            setError('Contraseña incorrecta. Intenta de nuevo.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] bg-gray-50 p-8 rounded-xl shadow-lg max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Acceso Restringido</h2>
            <p className="text-gray-600 mb-6 text-center">Por favor, ingresa la contraseña de usuario o administrador.</p>
            <form onSubmit={handleLogin} className="w-full space-y-4">
                <div>
                    <label htmlFor="password" className="sr-only">Contraseña</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setError('');
                        }}
                        placeholder="Ingresa la contraseña"
                        required
                        className="w-full rounded-md border-gray-300 shadow-sm p-3 border focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>
                {error && <div className="text-red-600 text-sm font-semibold">{error}</div>}
                <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition duration-300"
                >
                    Acceder
                </button>
            </form>
        </div>
    );
};

// Componente para la seccion de Ingreso de Datos (Ahora envia a la base de datos de "pendientes")
const DataEntryForm = ({ onAddEntry, isAuthReady, onLogout }) => {
    const [name, setName] = useState('');
    const [plot, setPlot] = useState('');
    const [plate, setPlate] = useState('');
    const [make, setMake] = useState('');
    const [otherMake, setOtherMake] = useState('');
    const [model, setModel] = useState('');
    const [otherModel, setOtherModel] = useState('');
    const [color, setColor] = useState('');
    const [otherColor, setOtherColor] = useState('');
    const [useType, setUseType] = useState('');
    const [otherUseType, setOtherUseType] = useState('');
    const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

    // Cuando cambia la marca, reinicia el modelo seleccionado
    useEffect(() => {
        setModel('');
    }, [make]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        let finalMake = make === 'Otro' ? otherMake : make;
        let finalModel = model === 'Otro' ? otherModel : model;
        let finalColor = color === 'Otro' ? otherColor : color;
        let finalUseType = useType === 'Otro' ? otherUseType : useType;

        // Validación para los campos seleccionados o de "Otro"
        if (!name || !plot || !plate || !finalMake || !finalModel || !finalColor || !finalUseType) {
            setStatusMessage({ text: 'Por favor, completa todos los campos del formulario.', type: 'error' });
            return;
        }

        try {
            await onAddEntry({
                name,
                plot,
                plate,
                make: finalMake,
                model: finalModel,
                color: finalColor,
                useType: finalUseType
            });
            // Resetear todos los estados
            setName('');
            setPlot('');
            setPlate('');
            setMake('');
            setOtherMake('');
            setModel('');
            setOtherModel('');
            setColor('');
            setOtherColor('');
            setUseType('');
            setOtherUseType('');
            setStatusMessage({ text: '¡Solicitud enviada! Pendiente de aprobación del administrador.', type: 'success' });
        } catch (error) {
            setStatusMessage({ text: 'Hubo un error al enviar la solicitud. Intenta de nuevo.', type: 'error' });
        }
    };

    return (
        <div className="bg-gray-50 p-6 rounded-xl shadow-lg relative">
            <button
                onClick={onLogout}
                className="absolute top-4 right-4 text-sm text-gray-500 hover:text-gray-700 transition duration-300"
            >
                Volver
            </button>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Registrar Nuevo Vehículo</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre del Propietario</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>
                <div>
                    <label htmlFor="plot" className="block text-sm font-medium text-gray-700">Número de Terreno</label>
                    <input
                        type="text"
                        id="plot"
                        value={plot}
                        onChange={(e) => setPlot(e.target.value)}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>
                <div>
                    <label htmlFor="plate" className="block text-sm font-medium text-gray-700">Patente del Vehículo</label>
                    <input
                        type="text"
                        id="plate"
                        value={plate}
                        onChange={(e) => setPlate(e.target.value.toUpperCase())}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-indigo-500 focus:ring-indigo-500 uppercase"
                    />
                </div>
                <div>
                    <label htmlFor="make" className="block text-sm font-medium text-gray-700">Marca</label>
                    <select
                        id="make"
                        value={make}
                        onChange={(e) => setMake(e.target.value)}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        <option value="" disabled>Seleccionar marca...</option>
                        {Object.keys(sortedVehicleData).map(makeOption => (
                            <option key={makeOption} value={makeOption}>
                                {makeOption}
                            </option>
                        ))}
                        <option value="Otro">Otro...</option>
                    </select>
                    {make === 'Otro' && (
                        <input
                            type="text"
                            value={otherMake}
                            onChange={(e) => setOtherMake(e.target.value)}
                            placeholder="Ingresa la marca"
                            required
                            className="mt-2 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    )}
                </div>
                <div>
                    <label htmlFor="model" className="block text-sm font-medium text-gray-700">Modelo</label>
                    <select
                        id="model"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        required
                        disabled={!make}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-gray-200"
                    >
                        <option value="" disabled>Seleccionar modelo...</option>
                        {make && sortedVehicleData[make]?.map(modelOption => (
                            <option key={modelOption} value={modelOption}>
                                {modelOption}
                            </option>
                        ))}
                        {make && <option value="Otro">Otro...</option>}
                    </select>
                    {model === 'Otro' && (
                        <input
                            type="text"
                            value={otherModel}
                            onChange={(e) => setOtherModel(e.target.value)}
                            placeholder="Ingresa el modelo"
                            required
                            className="mt-2 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    )}
                </div>
                <div>
                    <label htmlFor="color" className="block text-sm font-medium text-gray-700">Color</label>
                    <select
                        id="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        <option value="" disabled>Seleccionar color...</option>
                        {sortedCommonColors.map(colorOption => (
                            <option key={colorOption} value={colorOption}>
                                {colorOption}
                            </option>
                        ))}
                        <option value="Otro">Otro...</option>
                    </select>
                    {color === 'Otro' && (
                        <input
                            type="text"
                            value={otherColor}
                            onChange={(e) => setOtherColor(e.target.value)}
                            placeholder="Ingresa el color"
                            required
                            className="mt-2 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    )}
                </div>
                <div>
                    <label htmlFor="useType" className="block text-sm font-medium text-gray-700">Uso del Vehículo</label>
                    <select
                        id="useType"
                        value={useType}
                        onChange={(e) => setUseType(e.target.value)}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        <option value="" disabled>Seleccionar uso...</option>
                        {sortedUseTypes.map(useTypeOption => (
                            <option key={useTypeOption} value={useTypeOption}>
                                {useTypeOption}
                            </option>
                        ))}
                        <option value="Otro">Otro...</option>
                    </select>
                    {useType === 'Otro' && (
                        <input
                            type="text"
                            value={otherUseType}
                            onChange={(e) => setOtherUseType(e.target.value)}
                            placeholder="Ingresa el tipo de uso"
                            required
                            className="mt-2 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    )}
                </div>
                <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition duration-300"
                    disabled={!isAuthReady}
                >
                    {isAuthReady ? 'Enviar Solicitud' : 'Conectando...'}
                </button>
                {statusMessage.text && (
                    <div className={`mt-4 p-3 rounded-lg text-center font-semibold ${statusMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {statusMessage.text}
                    </div>
                )}
            </form>
        </div>
    );
};

// Componente para la seccion de Busqueda
const Search = ({ vehicles, onLogout, userRole, onDeleteVehicle }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [foundEntry, setFoundEntry] = useState(null);
    const [message, setMessage] = useState('');
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

    const handleSearch = () => {
        if (searchTerm === '') {
            setMessage('Por favor, ingrese una patente para buscar.');
            setFoundEntry(null);
            return;
        }

        const found = vehicles.find(v => v.plate.toUpperCase() === searchTerm.toUpperCase());
        if (found) {
            setFoundEntry(found);
            setMessage(`Patente "${searchTerm}" encontrada.`);
        } else {
            setFoundEntry(null);
            setMessage(`Patente "${searchTerm}" no se encuentra en la base de datos.`);
        }
    };

    const handleDeleteClick = () => {
        setShowDeleteConfirmation(true);
    };

    const handleConfirmDelete = async () => {
        if (foundEntry) {
            await onDeleteVehicle(foundEntry.id);
            setFoundEntry(null);
            setSearchTerm('');
            setMessage('Registro eliminado exitosamente.');
        }
        setShowDeleteConfirmation(false);
    };

    const handleCancelDelete = () => {
        setShowDeleteConfirmation(false);
    };

    return (
        <div className="bg-gray-50 p-6 rounded-xl shadow-lg relative">
            <button
                onClick={onLogout}
                className="absolute top-4 right-4 text-sm text-gray-500 hover:text-gray-700 transition duration-300"
            >
                Volver
            </button>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Verificar Patente</h2>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-4">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                    placeholder="Ingresa la patente a buscar"
                    className="flex-grow rounded-md border-gray-300 shadow-sm p-2 border focus:border-indigo-500 focus:ring-indigo-500 uppercase"
                />
                <button
                    onClick={handleSearch}
                    className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 transition duration-300"
                >
                    Buscar
                </button>
            </div>
            {message && (
                <div className={`p-4 rounded-lg font-semibold ${foundEntry ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message}
                </div>
            )}
            {foundEntry && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                    <h3 className="font-bold text-lg mb-2">Detalles del Registro</h3>
                    <p><strong>Propietario:</strong> {foundEntry.name}</p>
                    <p><strong>Terreno:</strong> {foundEntry.plot}</p>
                    <p><strong>Patente:</strong> {foundEntry.plate}</p>
                    <p><strong>Marca:</strong> {foundEntry.make}</p>
                    <p><strong>Modelo:</strong> {foundEntry.model}</p>
                    <p><strong>Color:</strong> {foundEntry.color}</p>
                    <p><strong>Uso:</strong> {foundEntry.useType}</p>
                    {/* Show delete button only if user is an admin */}
                    {userRole === 'admin' && (
                        <button
                            onClick={handleDeleteClick}
                            className="mt-4 w-full py-2 bg-red-600 text-white font-bold rounded-lg shadow-lg hover:bg-red-700 transition duration-300"
                        >
                            Eliminar Registro
                        </button>
                    )}
                </div>
            )}
            {/* Confirmation Modal */}
            {showDeleteConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl text-center">
                        <p className="text-lg font-semibold mb-4">¿Estás seguro que deseas eliminar este registro?</p>
                        <div className="flex justify-center space-x-4">
                            <button
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition"
                            >
                                Confirmar
                            </button>
                            <button
                                onClick={handleCancelDelete}
                                className="px-4 py-2 bg-gray-400 text-white font-bold rounded-lg hover:bg-gray-500 transition"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Componente para el Panel de Administracion
const AdminPanel = ({ isAuthReady, pendingVehicles, vehicles, onLogout }) => {
    const [showAllVehicles, setShowAllVehicles] = useState(false);

    const handleApprove = async (vehicle) => {
        try {
            const vehicleRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'vehicles'), vehicle.id);
            await setDoc(vehicleRef, {
                ...vehicle,
                status: 'approved',
                approvedAt: new Date(),
            });

            await deleteDoc(doc(collection(db, 'artifacts', appId, 'public', 'data', 'pending_vehicles'), vehicle.id));
        } catch (error) {
            console.error("Error approving entry:", error);
        }
    };

    const handleReject = async (id) => {
        try {
            await deleteDoc(doc(collection(db, 'artifacts', appId, 'public', 'data', 'pending_vehicles'), id));
        } catch (error) {
            console.error("Error rejecting entry:", error);
        }
    };

    return (
        <div className="bg-red-50 p-6 rounded-xl shadow-lg md:col-span-2 relative">
            <button
                onClick={onLogout}
                className="absolute top-4 right-4 text-sm text-gray-500 hover:text-gray-700 transition duration-300"
            >
                Volver
            </button>
            <h2 className="text-xl font-bold text-red-800 mb-4">Panel de Administración</h2>

            {/* Panel de Solicitudes Pendientes */}
            <h3 className="text-lg font-bold text-red-700 mb-2">Solicitudes Pendientes</h3>
            {isAuthReady && pendingVehicles.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No hay solicitudes pendientes.</div>
            ) : (
                <ul className="space-y-4 mb-6">
                    {pendingVehicles.map(vehicle => (
                        <li key={vehicle.id} className="bg-white p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between border-l-4 border-red-400">
                            <div className="mb-2 sm:mb-0">
                                <p><strong>Propietario:</strong> {vehicle.name}</p>
                                <p><strong>Terreno:</strong> {vehicle.plot}</p>
                                <p><strong>Patente:</strong> {vehicle.plate}</p>
                                <p><strong>Marca:</strong> {vehicle.make}</p>
                                <p><strong>Modelo:</strong> {vehicle.model}</p>
                                <p><strong>Color:</strong> {vehicle.color}</p>
                                <p><strong>Uso:</strong> {vehicle.useType}</p>
                            </div>
                            <div className="flex space-x-2 mt-2 sm:mt-0">
                                <button
                                    onClick={() => handleApprove(vehicle)}
                                    className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition"
                                >
                                    Aprobar
                                </button>
                                <button
                                    onClick={() => handleReject(vehicle.id)}
                                    className="px-4 py-2 bg-gray-400 text-white font-semibold rounded-lg hover:bg-gray-500 transition"
                                >
                                    Rechazar
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {/* Panel para ver todos los registros aprobados */}
            <hr className="my-6 border-red-300" />
            <h3 className="text-lg font-bold text-red-700 mb-2">Registros Aprobados</h3>
            <button
                onClick={() => setShowAllVehicles(!showAllVehicles)}
                className="w-full py-2 bg-red-600 text-white font-bold rounded-lg shadow-lg hover:bg-red-700 transition duration-300 mb-4"
            >
                {showAllVehicles ? 'Ocultar Registros' : `Ver todos los registros (${vehicles.length})`}
            </button>
            {showAllVehicles && (
                isAuthReady && vehicles.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No hay registros aprobados.</div>
                ) : (
                    <ul className="space-y-4">
                        {vehicles.map(vehicle => (
                            <li key={vehicle.id} className="bg-white p-4 rounded-lg border-l-4 border-red-400">
                                <p><strong>Propietario:</strong> {vehicle.name}</p>
                                <p><strong>Terreno:</strong> {vehicle.plot}</p>
                                <p><strong>Patente:</strong> {vehicle.plate}</p>
                                <p><strong>Marca:</strong> {vehicle.make}</p>
                                <p><strong>Modelo:</strong> {vehicle.model}</p>
                                <p><strong>Color:</strong> {vehicle.color}</p>
                                <p><strong>Uso:</strong> {vehicle.useType}</p>
                            </li>
                        ))}
                    </ul>
                )
            )}
        </div>
    );
};

// Componente principal de la aplicacion
const App = () => {
    const [userId, setUserId] = useState(null);
    const [vehicles, setVehicles] = useState([]);
    const [pendingVehicles, setPendingVehicles] = useState([]);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [userRole, setUserRole] = useState(null); // 'user', 'admin', or null

    const handleLogout = () => {
        setUserRole(null);
    };

    // Maneja los cambios de estado de autenticación de Firebase
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
            }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    // Escucha los cambios de datos en tiempo real en Firestore, SOLO para vehiculos aprobados
    useEffect(() => {
        if (!isAuthReady || !userRole) return;
        const vehiclesCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'vehicles');
        const unsubscribe = onSnapshot(vehiclesCollectionRef, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setVehicles(data);
        }, (error) => {
            console.error("Error al escuchar los datos:", error);
        });

        return () => unsubscribe();
    }, [isAuthReady, userRole]);

    // Escucha los cambios de datos de vehiculos pendientes SOLO si el rol es 'admin'
    useEffect(() => {
        if (!isAuthReady || userRole !== 'admin') return;
        const pendingVehiclesCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'pending_vehicles');
        const unsubscribe = onSnapshot(pendingVehiclesCollectionRef, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPendingVehicles(data);
        }, (error) => {
            console.error("Error al escuchar los datos:", error);
        });

        return () => unsubscribe();
    }, [isAuthReady, userRole]);

    const handleAddEntry = async (entry) => {
        if (!userId) {
            console.error("User not authenticated.");
            throw new Error("User not authenticated.");
        }
        try {
            const newDocRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'pending_vehicles'));
            await setDoc(newDocRef, {
                ...entry,
                createdAt: new Date(),
                userId: userId,
            });
        } catch (error) {
            console.error("Error al guardar el registro:", error);
            throw error;
        }
    };

    const handleDeleteVehicle = async (id) => {
        try {
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'vehicles', id);
            await deleteDoc(docRef);
            console.log("Documento eliminado exitosamente!");
        } catch (error) {
            console.error("Error al eliminar el documento:", error);
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen p-4 sm:p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-indigo-700 mb-2">Base de Datos de Acceso</h1>
                    <p className="text-lg text-gray-600">Gestión de residentes y vehículos del condominio</p>
                    {userId && (
                        <div className="mt-4 p-2 bg-gray-200 rounded-md text-sm text-gray-800 font-mono break-all">
                            ID de Comunidad (para compartir): <br /> {appId}
                        </div>
                    )}
                </header>
                <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {userRole ? (
                        <>
                            <DataEntryForm onAddEntry={handleAddEntry} isAuthReady={isAuthReady} onLogout={handleLogout} />
                            <Search vehicles={vehicles} onLogout={handleLogout} userRole={userRole} onDeleteVehicle={handleDeleteVehicle} />
                            {userRole === 'admin' && (
                                <AdminPanel isAuthReady={isAuthReady} pendingVehicles={pendingVehicles} vehicles={vehicles} onLogout={handleLogout} />
                            )}
                        </>
                    ) : (
                        <AuthScreen onLogin={setUserRole} />
                    )}
                </main>
            </div>
        </div>
    );
};

export default App;
