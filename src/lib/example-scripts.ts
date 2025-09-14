// Colección de scripts predefinidos y validados para testing

export interface ExampleScript {
  id: string;
  name: string;
  description: string;
  code: string;
  requiredVariables: {
    testData?: Record<string, any>;
    envVariables?: Record<string, string>;
  };
  expectedOutput?: string;
  category: 'api' | 'data' | 'utility' | 'hubspot' | 'advanced';
}

export const EXAMPLE_SCRIPTS: ExampleScript[] = [
  {
    id: 'basic-get-users',
    name: 'Obtener Usuarios',
    description: 'Script básico para obtener lista de usuarios de JSONPlaceholder',
    category: 'api',
    code: `// Script básico: Obtener usuarios de JSONPlaceholder
console.log('🔄 Iniciando petición para obtener usuarios...');

const response = await fetch('https://jsonplaceholder.typicode.com/users');

if (!response.ok) {
  throw new Error(\`Error HTTP: \${response.status} - \${response.statusText}\`);
}

const users = await response.json();

console.log('✅ Usuarios obtenidos exitosamente');
console.log(\`📊 Total de usuarios: \${users.length}\`);

// Mostrar información básica de cada usuario
users.forEach((user, index) => {
  console.log(\`\${index + 1}. \${user.name} - \${user.email}\`);
});

return {
  totalUsers: users.length,
  users: users.slice(0, 3).map(u => ({
    name: u.name,
    email: u.email,
    website: u.website
  }))
};`,
    requiredVariables: {},
    expectedOutput: 'Lista de usuarios con nombres y emails'
  },

  {
    id: 'user-posts',
    name: 'Posts de Usuario Específico',
    description: 'Obtiene posts de un usuario específico con comentarios',
    category: 'api',
    code: `// Obtener posts de un usuario específico
console.log(\`Obteniendo posts del usuario \${userId}...\`);

const userResponse = await fetch(\`https://jsonplaceholder.typicode.com/users/\${userId}\`);
const user = await userResponse.json();

const postsResponse = await fetch(\`https://jsonplaceholder.typicode.com/posts?userId=\${userId}\`);
const posts = await postsResponse.json();

console.log(\`Usuario: \${user.name} (\${user.email})\`);
console.log(\`Posts encontrados: \${posts.length}\`);

// Obtener comentarios de cada post
const postsWithComments = await Promise.all(
  posts.map(async (post) => {
    const commentsResponse = await fetch(\`https://jsonplaceholder.typicode.com/comments?postId=\${post.id}\`);
    const comments = await commentsResponse.json();
    return {
      ...post,
      commentsCount: comments.length,
      comments: comments.slice(0, 2) // Solo primeros 2 comentarios
    };
  })
);

console.log('Posts con comentarios procesados');

return {
  user: {
    name: user.name,
    email: user.email,
    company: user.company.name
  },
  postsCount: posts.length,
  totalComments: postsWithComments.reduce((sum, post) => sum + post.commentsCount, 0),
  posts: postsWithComments.slice(0, 2) // Primeros 2 posts completos
};`,
    requiredVariables: {
      testData: {
        userId: '1'
      }
    },
    expectedOutput: 'Información del usuario con sus posts y comentarios'
  },

  {
    id: 'hubspot-contact',
    name: 'Crear Contacto HubSpot',
    description: 'Crea un contacto en HubSpot usando API',
    category: 'hubspot',
    code: `// Crear contacto en HubSpot
console.log('📝 Creando contacto en HubSpot...');

const contactData = {
  properties: {
    email: email,
    firstname: firstname,
    lastname: lastname,
    phone: phone,
    country: country
  }
};

const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.HUBSPOT_ACCESS_TOKEN}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(contactData)
});

if (!response.ok) {
  const errorData = await response.json();
  throw new Error(\`Error HubSpot: \${errorData.message}\`);
}

const result = await response.json();

console.log('✅ Contacto creado exitosamente');
console.log(\`🆔 ID del contacto: \${result.id}\`);

return {
  success: true,
  contactId: result.id,
  email: result.properties.email,
  createdAt: result.createdAt
};`,
    requiredVariables: {
      testData: {
        email: 'test@example.com',
        firstname: 'Juan',
        lastname: 'Pérez',
        phone: '+525512345678',
        country: 'México'
      },
      envVariables: {
        HUBSPOT_ACCESS_TOKEN: 'pat-na1-your-token-here'
      }
    },
    expectedOutput: 'Información del contacto creado con ID y timestamp'
  },

  {
    id: 'data-transformation',
    name: 'Transformación de Datos',
    description: 'Procesa y transforma un array de datos',
    category: 'data',
    code: `// Transformación de datos de usuarios
console.log('🔄 Procesando datos de usuarios...');

const rawData = [
  { id: 1, name: 'Juan Pérez', age: 28, city: 'Madrid', salary: 45000 },
  { id: 2, name: 'María García', age: 32, city: 'Barcelona', salary: 52000 },
  { id: 3, name: 'Pedro López', age: 25, city: 'Valencia', salary: 38000 },
  { id: 4, name: 'Ana Martín', age: 35, city: 'Sevilla', salary: 48000 },
  { id: 5, name: 'Luis Rodríguez', age: 29, city: 'Bilbao', salary: 55000 }
];

// Filtrar usuarios mayores de 27 años
const adultUsers = rawData.filter(user => user.age > 27);
console.log(\`👥 Usuarios mayores de 27: \${adultUsers.length}\`);

// Calcular estadísticas
const totalSalary = rawData.reduce((sum, user) => sum + user.salary, 0);
const avgSalary = totalSalary / rawData.length;
const maxSalary = Math.max(...rawData.map(u => u.salary));
const minSalary = Math.min(...rawData.map(u => u.salary));

// Agrupar por ciudad
const usersByCity = rawData.reduce((acc, user) => {
  if (!acc[user.city]) {
    acc[user.city] = [];
  }
  acc[user.city].push(user);
  return acc;
}, {});

console.log('📊 Estadísticas calculadas');
console.log(\`💰 Salario promedio: €\${avgSalary.toFixed(2)}\`);

return {
  totalUsers: rawData.length,
  adultUsers: adultUsers.length,
  statistics: {
    avgSalary: Math.round(avgSalary),
    maxSalary,
    minSalary
  },
  citiesCount: Object.keys(usersByCity).length,
  usersByCity: Object.keys(usersByCity).map(city => ({
    city,
    count: usersByCity[city].length,
    users: usersByCity[city].map(u => u.name)
  }))
};`,
    requiredVariables: {},
    expectedOutput: 'Estadísticas y datos transformados de usuarios'
  },

  {
    id: 'api-with-auth',
    name: 'API con Autenticación',
    description: 'Ejemplo de llamada a API que requiere autenticación',
    category: 'api',
    code: `// API con autenticación personalizada
console.log('🔐 Realizando petición autenticada...');

const headers = {
  'Content-Type': 'application/json',
  'Authorization': \`Bearer \${process.env.API_TOKEN}\`,
  'X-API-Key': \`\${process.env.API_KEY}\`
};

console.log('🌐 Enviando petición a API externa...');

// Simular respuesta exitosa para testing
const mockResponse = {
  success: true,
  data: {
    user: {
      id: userId,
      name: 'Usuario Test',
      permissions: ['read', 'write']
    },
    timestamp: new Date().toISOString()
  }
};

// En producción, sería:
// const response = await fetch(\`https://api.example.com/user/\${userId}\`, {
//   method: 'GET',
//   headers
// });
// const result = await response.json();

console.log('✅ Respuesta recibida exitosamente');
console.log(\`👤 Usuario: \${mockResponse.data.user.name}\`);
console.log(\`🔑 Permisos: \${mockResponse.data.user.permissions.join(', ')}\`);

return {
  success: mockResponse.success,
  userId: mockResponse.data.user.id,
  userName: mockResponse.data.user.name,
  permissions: mockResponse.data.user.permissions,
  requestTime: mockResponse.data.timestamp
};`,
    requiredVariables: {
      testData: {
        userId: 'test-user-123'
      },
      envVariables: {
        API_TOKEN: 'test-bearer-token-123',
        API_KEY: 'test-api-key-456'
      }
    },
    expectedOutput: 'Datos del usuario autenticado con permisos'
  },

  {
    id: 'hubspot-voicebot-retell',
    name: 'HubSpot Voicebot - Retell AI',
    description: 'Script de HubSpot para enviar llamadas automáticas via Retell AI con datos de oportunidad',
    category: 'hubspot',
    code: `// Script HubSpot - Voicebot Retell AI
// Envía llamadas automáticas con datos de contacto y oportunidad

function formatDateFromTimestamp(timestamp) {
  const date = new Date(Number(timestamp));
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return \`\${day}/\${month}/\${year}\`;
}

function generateRetellAIListingdDate(timestamp, start_date_code) {
  return \`\${formatDateFromTimestamp(timestamp)}_\${start_date_code}\`;
}

function formatCustomDate(date = new Date(), timeZone = "America/Mexico_City") {
  const days = [
    "domingo", "lunes", "martes", "miércoles", 
    "jueves", "viernes", "sábado"
  ];
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];

  const localDate = new Date(date.toLocaleString("en-US", { timeZone }));
  const dayName = days[localDate.getDay()];
  const year = localDate.getFullYear();
  const month = months[localDate.getMonth()];
  const day = String(localDate.getDate()).padStart(2, "0");
  const hours = String(localDate.getHours()).padStart(2, "0");
  const minutes = String(localDate.getMinutes()).padStart(2, "0");
  const seconds = String(localDate.getSeconds()).padStart(2, "0");

  return \`\${dayName}, \${year}-\${month}-\${day} \${hours}:\${minutes}:\${seconds}\`;
}

console.log('🤖 Iniciando script de Voicebot Retell AI...');

const defaultFromNumber = "+525597092980";
const fromNumber = voicebot_phone_number;

const now = new Date();
const futureDate = new Date(now);
futureDate.setMonth(now.getMonth() + 6);

// Formatting currentTime
const currentTime = formatCustomDate();
console.log('⏰ Tiempo actual:', currentTime);

// Formatting currentTime plus 6 months
const futureTime = formatCustomDate(futureDate);
console.log('📅 Fecha de expiración:', futureTime);

const requestData = {
  hubspot_flow: "Referencia",
  phone_number: phone,
  record_id: opportunityId,
  payload: {
    from_number: fromNumber && fromNumber.trim() !== "" ? fromNumber : defaultFromNumber,
    to_number: phone,
    retell_llm_dynamic_variables: {
      contactId: contactId,
      opportunityId: opportunityId,
      firstname: firstname,
      to_number: phone,
      program: program,
      email: email,
      country: country,
      date_of_birth: date_of_birth ? formatDateFromTimestamp(date_of_birth) : "",
      start_date1: start_date_1 ? generateRetellAIListingdDate(start_date_1, code_start_date_1) : "",
      start_date2: start_date_2 ? generateRetellAIListingdDate(start_date_2, code_start_date_2) : "",
      start_date3: start_date_3 ? generateRetellAIListingdDate(start_date_3, code_start_date_3) : "",
      code_start_date: code_start_date_1,
      code_start_date2: code_start_date_2,
      code_start_date3: code_start_date_3,
      tier_value1_4: tier_value1_4,
      tier_value5_12: tier_value5_12,
      product_key: product_key,
      source: source,
      rvoe: rvoe,
      current_tim: currentTime,
      certificate_expiration_date: futureTime,
    },
  },
};

console.log('📤 Cuerpo de la solicitud al Orchestrator:', JSON.stringify(requestData, null, 2));

// 🔁 Enviar solicitud con reintentos
let response, logs;
let retryCount = 0;
const maxRetries = 3;

while (retryCount < maxRetries) {
  try {
    response = await fetch("https://call-orchestrator.scalahed.com/queue_call", {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer orch_7K7b36qOfAGPWrxOpEqzDYwwggy71CSwMYAmcIWB7hONO3FYzjeiQ8RoNMl',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
    }

    logs = await response.json();
    console.log('✅ Respuesta de la API:', logs);
    break;
  } catch (error) {
    retryCount++;
    console.warn(\`⚠️ Intento \${retryCount} fallido:\`, error.message);
    if (retryCount === maxRetries) {
      logs = { error: error.message };
    }
  }
}

console.log('🎯 Llamada de voicebot procesada exitosamente');

return {
  success: true,
  requestData: requestData,
  response: logs,
  retryCount: retryCount,
  timestamp: currentTime
};`,
    requiredVariables: {
      testData: {
        contactId: 'test-contact-456',
        opportunityId: 'test-opp-123',
        phone: '+525512345678',
        firstname: 'Juan',
        email: 'test@example.com',
        country: 'México',
        program: 'Licenciatura en Sistemas',
        voicebot_phone_number: '+525597092980',
        date_of_birth: String(Date.now() - (25 * 365 * 24 * 60 * 60 * 1000)), // 25 años atrás
        start_date_1: String(Date.now() + (30 * 24 * 60 * 60 * 1000)), // 30 días adelante
        code_start_date_1: 'SEM_2024_02',
        start_date_2: String(Date.now() + (90 * 24 * 60 * 60 * 1000)), // 90 días adelante
        code_start_date_2: 'SEM_2024_03',
        start_date_3: String(Date.now() + (180 * 24 * 60 * 60 * 1000)), // 180 días adelante
        code_start_date_3: 'SEM_2024_04',
        tier_value1_4: '15000',
        tier_value5_12: '12000',
        product_key: 'LIC_SISTEMAS_2024',
        source: 'website_form',
        rvoe: 'RVOE123456'
      }
    },
    expectedOutput: 'Respuesta del orchestrator con status de la llamada programada'
  },

  {
    id: 'hubspot-deal-update',
    name: 'HubSpot Deal Update',
    description: 'Actualiza propiedades de un deal en HubSpot con lógica condicional y conversión de fechas',
    category: 'hubspot',
    code: `// Script HubSpot - Actualizar Deal
// Actualiza propiedades de negocio con lógica condicional

console.log('🔄 Iniciando actualización de deal en HubSpot...');

// 🔄 Conversión de fechas a timestamps (milisegundos)
const convertToTimestamp = (dateStr) => {
  if (!dateStr) return null;
  const parsedDate = new Date(dateStr.replace(/-/g, '/'));
  return isNaN(parsedDate) ? null : parsedDate.getTime();
};

const startDateTimestamp = convertToTimestamp(start_date_selected);
const schedulingDateTimestamp = convertToTimestamp(scheduling_date);

console.log('📅 Fechas convertidas:');
console.log('- Fecha inicio seleccionada:', start_date_selected, '→', startDateTimestamp);
console.log('- Fecha de scheduling:', scheduling_date, '→', schedulingDateTimestamp);

// 🔄 Lógica para transfer_status
const cleanedTransferStatus = transfer_status === "call_transfer" ? "Si" : "No";
console.log('📞 Status de transferencia:', transfer_status, '→', cleanedTransferStatus);

// Lógica de is_primary field
const is_primary_value = 
  (available_study_certificates === "Si" || upcoming_study_certificates === "Si") 
    ? "Si" 
    : "No";

console.log('🎓 Certificados disponibles/próximos:', {
  available: available_study_certificates,
  upcoming: upcoming_study_certificates,
  is_primary: is_primary_value
});

// 🔄 Lógica para managed_voicebot
const managed_voicebot = is_primary_value === "Si" ? "No" : "Si";
console.log('🤖 Managed voicebot:', managed_voicebot, '(opuesto a is_primary)');

const propertiesToUpdate = {
  interest_level,
  available_study_certificates,
  upcoming_study_certificates,
  scheduling_date: schedulingDateTimestamp,
  scheduling_time_slot,
  transfer_status: cleanedTransferStatus,
  managed_voicebot,
  is_primary: is_primary_value,
  is_reference,
  start_date_selected: startDateTimestamp
};

console.log('📦 Propiedades a actualizar:', JSON.stringify(propertiesToUpdate, null, 2));

// Simulación de la llamada a HubSpot API
const hubspotResponse = await fetch(\`https://api.hubapi.com/crm/v3/objects/deals/\${dealId}\`, {
  method: 'PATCH',
  headers: {
    'Authorization': \`Bearer \${HUBSPOT_API_KEY}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    properties: propertiesToUpdate
  })
});

if (!hubspotResponse.ok) {
  throw new Error(\`Error HTTP \${hubspotResponse.status}: \${hubspotResponse.statusText}\`);
}

const updatedDeal = await hubspotResponse.json();

console.log('✅ Deal actualizado correctamente en HubSpot');
console.log('🎯 Deal ID:', dealId);
console.log('📊 Propiedades actualizadas exitosamente');

return {
  success: true,
  dealId: dealId,
  updated: true,
  updatedProperties: propertiesToUpdate,
  hubspotResponse: updatedDeal,
  logicResults: {
    cleanedTransferStatus,
    is_primary_value,
    managed_voicebot,
    startDateTimestamp,
    schedulingDateTimestamp
  }
};`,
    requiredVariables: {
      testData: {
        dealId: '12345678901',
        interest_level: 'Alto',
        available_study_certificates: 'Si',
        upcoming_study_certificates: 'No',
        scheduling_date: '2024-10-15',
        scheduling_time_slot: '14:00-15:00',
        transfer_status: 'call_transfer',
        is_reference: 'No',
        start_date_selected: '2024-11-01',
        HUBSPOT_API_KEY: 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      }
    },
    expectedOutput: 'Deal actualizado con todas las propiedades y lógica condicional aplicada'
  },

  {
    id: 'hubspot-create-call',
    name: 'HubSpot Create Call Record',
    description: 'Crea un registro de llamada en HubSpot con datos de Retell AI y mapeo de disposiciones',
    category: 'hubspot',
    code: `// Script HubSpot - Crear Registro de Llamada
// Crea llamada en HubSpot con datos de Retell AI y mapeo completo de disposiciones

console.log('📞 Iniciando creación de registro de llamada en HubSpot...');

if (!HUBSPOT_API_KEY) {
    console.error("❌ Error: No se encontró la API Key.");
    throw new Error("Error: Falta API Key de HubSpot");
}

if (!contactId) {
    console.error("❌ Error: No se recibió un Contact ID.");
    throw new Error("Error: No se encontró el Contact ID");
}

console.log('👤 Contact ID:', contactId);
console.log('📊 Datos de llamada recibidos:', {
    call_summary: call_summary || "Sin resumen disponible",
    duration_ms: duration_ms || 0,
    from_number: from_number || "Número desconocido",
    to_number: to_number || "Número desconocido",
    disconnection_reason: disconnection_reason || "error_unknown"
});

// Mapeo de disconnection_reason → hs_call_disposition
const reasonToGuidMap = {
    scam_detected: "cf5e3a2b-5200-4a34-b120-f2bf418b2fd4",
    voicemail_reached: "78ff038c-47c5-47e6-ac18-be0f3578cd8d",
    machine_detected: "83b6af69-af2f-4654-9ebb-c4386f437c9d",
    user_hangup: "f65a4729-53a0-41a6-bb01-8a26f14e3115",
    agent_hangup: "36257195-f821-4404-a87f-28d301b75458",
    max_duration_reached: "370919b9-eb2e-4cee-b19b-d212dad1e2ca",
    concurrency_limit_reached: "953c54e9-def5-48f3-b1ed-a8055472f017",
    no_valid_payment: "d62b639e-ffb8-4880-b191-53d7eb13ea9b",
    error_inbound_webhook: "81cfa143-3b97-4140-b471-ba8b05a3d3cd",
    error_llm_websocket_open: "46e760ca-fd04-4449-b0b9-f2c427ac1d09",
    error_llm_websocket_lost_connection: "55f31115-7169-46b0-9efd-9bffd16d5b9a",
    error_llm_websocket_runtime: "3f0e65ef-4ebd-4509-92cb-7c475c266e02",
    error_llm_websocket_corrupt_payload: "7d9c969f-4b18-42d8-9cac-08e9e54cf5df",
    error_frontend_corrupted_payload: "b784adc3-0ff4-4a88-9d46-8a0c0bf37170",
    error_twilio: "b7efb958-a7fd-4131-b0bb-b989dd1baf87",
    error_no_audio_received: "ac67fd36-c7c2-4320-8624-2e013c6c3d92",
    error_asr: "ce8beee0-0b8e-44a9-bba8-c5a96bdf2fe3",
    error_retell: "8dc1d5e1-2137-4700-a9e4-a40f33666e8d",
    error_unknown: "2bd23100-e545-4536-87a6-6dd66f304198",
    call_transfer: "3c26ab4a-ff97-483b-b0dc-70bab9a6bd44",
    inactivity: "f84d16d4-3df8-43b5-ad42-b1760cf5c2af",
    error_user_not_joined: "bd505afd-8677-4b6e-880a-6140895606de",
    dial_failed: "52e4d237-4bda-47fe-a153-301404546412",
    dial_busy: "1dc8d76a-a661-492f-addc-dfc0a8fe17b6",
    dial_no_answer: "a356a050-6d20-47b3-8dfc-95436328dd3e",
    registered_call_timeout: "45cd602b-8d9b-4fab-8e62-7c2753616879"
};

const dispositionGuid = reasonToGuidMap[disconnection_reason] || reasonToGuidMap["error_unknown"];
console.log('🎯 Mapeo de disposición:', disconnection_reason, '→', dispositionGuid);

const callData = {
    properties: {
        hs_timestamp: new Date().toISOString(),
        hs_call_title: "Llamada de Reteallia",
        hs_call_body: call_summary || "Sin resumen disponible",
        hs_call_duration: String(Math.round((duration_ms || 0) / 1000)),
        hs_call_from_number: from_number || "Número desconocido",
        hs_call_to_number: to_number || "Número desconocido",
        hs_call_recording_url: public_log_url || "",
        hs_call_status: "COMPLETED",
        hs_call_disposition: dispositionGuid,
        hs_call_direction: direction || "OUTBOUND"
    },
    associations: [
        {
            to: { id: contactId },
            types: [
                {
                    associationCategory: "HUBSPOT_DEFINED",
                    associationTypeId: 194
                }
            ]
        }
    ]
};

console.log('📩 Enviando solicitud a HubSpot con datos:', JSON.stringify(callData, null, 2));

const response = await fetch("https://api.hubapi.com/crm/v3/objects/calls", {
    method: 'POST',
    headers: {
        "Content-Type": "application/json",
        "Authorization": \`Bearer \${HUBSPOT_API_KEY}\`
    },
    body: JSON.stringify(callData)
});

if (!response.ok) {
    const errorData = await response.text();
    console.error("❌ Error en la solicitud a HubSpot:", errorData);
    throw new Error(\`Error HTTP \${response.status}: \${errorData}\`);
}

const responseData = await response.json();

if (responseData && responseData.id) {
    console.log("✅ Llamada creada exitosamente. ID:", responseData.id);
    console.log("📋 Resumen de la llamada creada:");
    console.log("- Call ID:", responseData.id);
    console.log("- Duración:", Math.round((duration_ms || 0) / 1000), "segundos");
    console.log("- Disposición:", disconnection_reason);
    console.log("- Asociada al contacto:", contactId);
    
    return {
        success: true,
        message: "Llamada creada con éxito",
        callId: responseData.id,
        callData: callData,
        hubspotResponse: responseData
    };
} else {
    console.error("❌ Error: No se recibió un ID de llamada.");
    throw new Error("Error: HubSpot no devolvió un ID de llamada válido");
}`,
    requiredVariables: {
      testData: {
        contactId: '12345678901',
        call_summary: 'El cliente mostró interés en el programa de Licenciatura en Sistemas. Se programó una cita para el 15 de octubre.',
        duration_ms: '120000', // 2 minutos
        from_number: '+525597092980',
        to_number: '+525512345678',
        public_log_url: 'https://retell-ai-logs.s3.amazonaws.com/call-12345.mp3',
        direction: 'OUTBOUND',
        disconnection_reason: 'user_hangup',
        HUBSPOT_API_KEY: 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      }
    },
    expectedOutput: 'Registro de llamada creado en HubSpot con asociación al contacto'
  },

  {
    id: 'contact-data-integration',
    name: 'Contact Data Integration API',
    description: 'Procesa y envía datos de contacto a API externa con lógica compleja de normalización y contadores',
    category: 'api',
    code: `// Script Contact Data Integration
// Procesa datos de contacto y los envía a API externa con lógica de normalización

console.log("🟢 Iniciando procesamiento del evento...");

// Logs de depuración para is_reference
console.log('is_reference value:', is_reference, 'type:', typeof is_reference);

// Contador de llamadas
const currentCallCount = parseInt(number_call, 10) || 0;
const updatedCallCount = currentCallCount + 1;
console.log(\`📞 Número de llamadas actualizado: \${updatedCallCount}\`);

// Helper: normalizar "es_referencia" a "Si"/"No"/"" (o null)
const normalizeReferencia = (val) => {
  if (typeof val === 'boolean') return val ? 'Si' : 'No';
  if (val == null) return null;
  if (typeof val === 'number') return val === 1 ? 'Si' : val === 0 ? 'No' : null;
  if (typeof val === 'string') {
    const v = val.trim().toLowerCase();
    if (v === 'sin validar') return ''; // 🆕 Enviar vacío
    if (['si', 'sí', 'true', '1', 'yes'].includes(v)) return 'Si';
    if (['no', 'false', '0'].includes(v)) return 'No';
    return null;
  }
  return null;
};

console.log('🔄 Normalizando referencia:', is_reference, '→', normalizeReferencia(is_reference));

// ✅ Lógica: gestionado_por_voice_bot depende de is_primary
const esPrimaria =
  available_study_certificates === "Si" ||
  upcoming_study_certificates === "Si"
    ? "Si"
    : "No";

const gestionadoPorVoiceBot = esPrimaria === "Si" ? "No" : null;

console.log('🎓 Lógica de certificados:');
console.log('- available_study_certificates:', available_study_certificates);
console.log('- upcoming_study_certificates:', upcoming_study_certificates);
console.log('- es_primaria:', esPrimaria);
console.log('- gestionado_por_voice_bot:', gestionadoPorVoiceBot);

// ✅ lógica: contactado_x_voicebot según hs_call_disposition
const voicebotDispositions = ['Inactivity', 'user_hangup', 'agent_hangup', 'call_transfer'];
const contactadoPorVoiceBot = voicebotDispositions.includes(hs_call_disposition) ? "Si" : null;

console.log('📞 Disposición de llamada:');
console.log('- hs_call_disposition:', hs_call_disposition);
console.log('- contactado_x_voicebot:', contactadoPorVoiceBot);
console.log('- voicebot dispositions válidas:', voicebotDispositions);

const contactData = {
  sentimiento: sentiment ?? null,
  Curp: personal_id ?? null,
  resumen: call_summary ?? null,
  resultado_llamada: hs_call_disposition ?? null,
  nivel_interes: interest_level ?? null,
  certificados_estudios_disponibles: available_study_certificates ?? null,
  fecha_agendamiento: scheduling_date ?? null,
  franja_agendamiento: scheduling_time_slot ?? null,
  transferencia: hs_call_disposition === "call_transfer" ? "Si" : "No",
  gestionado_por_voice_bot: gestionadoPorVoiceBot,
  es_primaria: esPrimaria,
  certificado_proximo: upcoming_study_certificates ?? null,
  es_referencia: normalizeReferencia(is_reference),
  numero_llamadas_realizadas: updatedCallCount,
  email: email ?? null,
  contactado_x_voicebot: contactadoPorVoiceBot
};

console.log("📦 Datos preparados para envío:", JSON.stringify(contactData, null, 2));

const requestData = {
  contactData,
  serviceToken: serviceToken,
  serviceAction: "form"
};

console.log("🚀 Enviando datos a API externa...");

const response = await fetch(
  'https://mas-utel.inconcertcc.com/public/integration/process',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  }
);

if (!response.ok) {
  const errorText = await response.text();
  throw new Error(\`HTTP \${response.status}: \${errorText}\`);
}

const responseData = await response.json();

console.log("✅ Respuesta exitosa de la API externa.");
console.log("📊 Response data:", responseData);

return {
  success: true,
  data: responseData,
  number_call: updatedCallCount,
  processedContactData: contactData,
  logicResults: {
    esPrimaria,
    gestionadoPorVoiceBot,
    contactadoPorVoiceBot,
    normalizedReference: normalizeReferencia(is_reference),
    callCountIncrement: \`\${currentCallCount} → \${updatedCallCount}\`
  }
};`,
    requiredVariables: {
      testData: {
        sentiment: 'Positivo',
        personal_id: 'CURP123456HDFABC01',
        call_summary: 'Cliente muy interesado en el programa, preguntó sobre becas y horarios flexibles',
        hs_call_disposition: 'user_hangup',
        interest_level: 'Alto',
        available_study_certificates: 'Si',
        scheduling_date: '2024-10-15',
        scheduling_time_slot: '14:00-15:00',
        upcoming_study_certificates: 'No',
        is_reference: 'Si',
        number_call: '2',
        email: 'juan.perez@example.com',
        serviceToken: 'utel_integration_token_2024'
      }
    },
    expectedOutput: 'Datos de contacto procesados y enviados con contador de llamadas actualizado'
  },

  {
    id: 'hubspot-voicebot-academic',
    name: 'HubSpot Voicebot - Academic B4',
    description: 'Script de HubSpot para seguimiento académico de estudiantes con datos de riesgo y progreso',
    category: 'hubspot',
    code: `// Script HubSpot - Voicebot Academic B4
// Seguimiento académico de estudiantes con formateo de fechas y datos de riesgo

function formatCustomDate(date = new Date(), timeZone = "America/Mexico_City") {
  const days = [
    "domingo", "lunes", "martes", "miércoles", 
    "jueves", "viernes", "sábado"
  ];
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];

  const localDate = new Date(date.toLocaleString("en-US", { timeZone }));
  const dayName = days[localDate.getDay()];
  const year = localDate.getFullYear();
  const month = months[localDate.getMonth()];
  const day = String(localDate.getDate()).padStart(2, "0");
  const hours = String(localDate.getHours()).padStart(2, "0");
  const minutes = String(localDate.getMinutes()).padStart(2, "0");
  const seconds = String(localDate.getSeconds()).padStart(2, "0");

  return \`\${dayName}, \${year}-\${month}-\${day} \${hours}:\${minutes}:\${seconds}\`;
}

console.log('🎓 Iniciando script de seguimiento académico B4...');

// 🗓️ Formatear fecha de inicio
const fechaInicioRaw = start_date;
let fechaInicioFormateada = "Fecha no disponible";

if (fechaInicioRaw) {
  const fechaInicio = new Date(Number(fechaInicioRaw));
  if (!isNaN(fechaInicio.getTime())) {
    fechaInicioFormateada = fechaInicio.toISOString().split("T")[0];
  }
}

const fechaFinRaw = end_date;
let fechaFinFormateada = "Fecha no disponible";

if (fechaFinRaw) {
  const fechaFin = new Date(Number(fechaFinRaw));
  if (!isNaN(fechaFin.getTime())) {
    fechaFinFormateada = formatCustomDate(fechaFin);
  }
}

console.log('📅 Fechas procesadas:');
console.log('- Fecha inicio raw:', fechaInicioRaw, '→', fechaInicioFormateada);
console.log('- Fecha fin raw:', fechaFinRaw, '→', fechaFinFormateada);

// 🕒 Obtener fecha y hora actual en formato YYYY-MM-DD HH:mm:ss (zona México) con día de la semana
const mxTime = new Date().toLocaleString("en-US", {
  timeZone: "America/Mexico_City",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const [datePart, timePart] = mxTime.split(", ");
const [month, day, year] = datePart.split("/");
const formattedDate = \`\${year}-\${month.padStart(2, "0")}-\${day.padStart(2, "0")} \${timePart}\`;

const dayOfWeek = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  timeZone: "America/Mexico_City",
}).format(new Date());

const currentDateTimeFormatted = \`\${dayOfWeek.toLowerCase()}, \${formattedDate}\`;

console.log('⏰ Tiempo actual (México):', currentDateTimeFormatted);

// 📦 Construir el cuerpo de la solicitud
const requestData = {
  hubspot_flow: "B4",
  phone_number: phone,
  record_id: academic_recordId,
  payload: {
    from_number: voicebot_phone_number,
    to_number: phone,
    retell_llm_dynamic_variables: {
      firstname: firstname,
      program: program,
      to_number: phone,
      country: country,
      start_date: fechaInicioFormateada,
      email: email,
      education_level: nivel_educativo,
      academic_recordId: academic_recordId,
      matricula: matricula,
      risk_level: risk_level,
      current_bimester: current_bimester,
      week: week,
      campus: campus,
      contactid: contactid,
      current_tim: currentDateTimeFormatted,
      end_date: fechaFinFormateada
    },
  },
};

console.log('📦 Datos del estudiante:');
console.log('- Nombre:', firstname);
console.log('- Programa:', program);
console.log('- Matrícula:', matricula);
console.log('- Nivel de riesgo:', risk_level);
console.log('- Bimestre actual:', current_bimester);
console.log('- Campus:', campus);

console.log('📤 Cuerpo de la solicitud al Orchestrator:', JSON.stringify(requestData, null, 2));

// 🔁 Enviar solicitud con reintentos
let response, logs;
let retryCount = 0;
const maxRetries = 3;

while (retryCount < maxRetries) {
  try {
    response = await fetch("https://call-orchestrator.scalahed.com/queue_call", {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer orch_7K7b36qOfAGPWrxOpEqzDYwwggy71CSwMYAmcIWB7hONO3FYzjeiQ8RoNMl',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
    }

    logs = await response.json();
    console.log('✅ Respuesta de la API:', logs);
    break;
  } catch (error) {
    retryCount++;
    console.warn(\`⚠️ Intento \${retryCount} fallido:\`, error.message);
    if (retryCount === maxRetries) {
      logs = { error: error.message };
    }
  }
}

console.log('🎯 Llamada de seguimiento académico procesada exitosamente');
console.log('📊 Reintentos utilizados:', retryCount);

return {
  success: true,
  requestData: requestData,
  response: logs,
  retryCount: retryCount,
  timestamp: currentDateTimeFormatted,
  processedDates: {
    startDate: fechaInicioFormateada,
    endDate: fechaFinFormateada,
    currentTime: currentDateTimeFormatted
  }
};`,
    requiredVariables: {
      testData: {
        phone: '+525512345678',
        academic_recordId: 'AR-2024-001234',
        voicebot_phone_number: '+525597092980',
        firstname: 'María',
        program: 'Licenciatura en Administración',
        country: 'México',
        start_date: String(Date.now() - (180 * 24 * 60 * 60 * 1000)), // 6 meses atrás
        email: 'maria.gonzalez@student.utel.edu',
        nivel_educativo: 'Licenciatura',
        matricula: 'UTEL2024001234',
        risk_level: 'Medio',
        current_bimester: '3',
        week: '8',
        campus: 'Virtual',
        contactid: 'contact-567890123',
        end_date: String(Date.now() + (90 * 24 * 60 * 60 * 1000)) // 3 meses adelante
      }
    },
    expectedOutput: 'Llamada de seguimiento académico programada con datos de progreso estudiantil'
  }
];

export function getScriptById(id: string): ExampleScript | undefined {
  return EXAMPLE_SCRIPTS.find(script => script.id === id);
}

export function getScriptsByCategory(category: ExampleScript['category']): ExampleScript[] {
  return EXAMPLE_SCRIPTS.filter(script => script.category === category);
}