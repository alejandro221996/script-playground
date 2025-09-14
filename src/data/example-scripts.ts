export const exampleScripts = [
  {
    id: 'jsonplaceholder-posts',
    name: 'JSONPlaceholder - Get Posts',
    description: 'Obtiene todos los posts de JSONPlaceholder',
    code: `// Obtener todos los posts
console.log('Obteniendo posts de JSONPlaceholder...');

const response = await fetch('https://jsonplaceholder.typicode.com/posts');
const posts = await response.json();

console.log(\`Se obtuvieron \${posts.length} posts\`);
console.log('Primeros 3 posts:', posts.slice(0, 3));

// Filtrar posts con títulos largos
const longTitlePosts = posts.filter(post => post.title.length > 40);
console.log(\`Posts con títulos largos: \${longTitlePosts.length}\`);

// Resultado final
return {
  totalPosts: posts.length,
  longTitlePosts: longTitlePosts.length,
  firstPost: posts[0],
  averageTitleLength: posts.reduce((sum, post) => sum + post.title.length, 0) / posts.length
};`
  },
  {
    id: 'jsonplaceholder-user-posts',
    name: 'JSONPlaceholder - User Posts',
    description: 'Obtiene posts de un usuario específico',
    code: `// Obtener posts de un usuario específico
const userId = 1;
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
};`
  },
  {
    id: 'jsonplaceholder-create-post',
    name: 'JSONPlaceholder - Create Post',
    description: 'Crea un nuevo post usando POST request',
    code: `// Crear un nuevo post
console.log('Creando un nuevo post...');

const newPost = {
  title: 'Mi nuevo post de prueba',
  body: 'Este es el contenido del post creado desde la aplicación de testing.',
  userId: 1
};

const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
  method: 'POST',
  body: JSON.stringify(newPost),
  headers: {
    'Content-type': 'application/json; charset=UTF-8',
  },
});

const createdPost = await response.json();
console.log('Post creado exitosamente:', createdPost);

// Verificar que se creó correctamente
if (createdPost.id) {
  console.log(\`✅ Post creado con ID: \${createdPost.id}\`);
  
  // Intentar obtener el post recién creado (nota: JSONPlaceholder no lo persiste realmente)
  const getResponse = await fetch(\`https://jsonplaceholder.typicode.com/posts/\${createdPost.id}\`);
  const retrievedPost = await getResponse.json();
  
  console.log('Post recuperado:', retrievedPost);
} else {
  console.log('❌ Error al crear el post');
}

return {
  success: !!createdPost.id,
  createdPost,
  message: createdPost.id ? 'Post creado exitosamente' : 'Error al crear el post'
};`
  },
  {
    id: 'multiple-apis',
    name: 'Multiple APIs Test',
    description: 'Prueba múltiples APIs y maneja errores',
    code: `// Probar múltiples APIs y manejo de errores
console.log('Iniciando pruebas con múltiples APIs...');

const apis = [
  { name: 'JSONPlaceholder Posts', url: 'https://jsonplaceholder.typicode.com/posts?_limit=5' },
  { name: 'JSONPlaceholder Users', url: 'https://jsonplaceholder.typicode.com/users?_limit=3' },
  { name: 'Invalid API (404)', url: 'https://jsonplaceholder.typicode.com/invalid-endpoint' },
  { name: 'Network Error', url: 'https://invalid-domain-that-does-not-exist.com/api' }
];

const results = [];

for (const api of apis) {
  console.log(\`📡 Probando: \${api.name}\`);
  
  try {
    const startTime = Date.now();
    const response = await fetch(api.url);
    const endTime = Date.now();
    
    if (response.ok) {
      const data = await response.json();
      console.log(\`✅ \${api.name}: OK (\${endTime - startTime}ms)\`);
      
      results.push({
        name: api.name,
        status: 'success',
        statusCode: response.status,
        responseTime: endTime - startTime,
        dataLength: Array.isArray(data) ? data.length : Object.keys(data).length
      });
    } else {
      console.log(\`❌ \${api.name}: HTTP \${response.status}\`);
      
      results.push({
        name: api.name,
        status: 'http_error',
        statusCode: response.status,
        error: response.statusText
      });
    }
    
  } catch (error) {
    console.log(\`🚫 \${api.name}: \${error.message}\`);
    
    results.push({
      name: api.name,
      status: 'network_error',
      error: error.message
    });
  }
  
  // Pequeña pausa entre requests
  await new Promise(resolve => setTimeout(resolve, 100));
}

console.log('\\n📊 Resumen de pruebas:');
const successful = results.filter(r => r.status === 'success').length;
const total = results.length;
console.log(\`Exitosas: \${successful}/\${total}\`);

return {
  summary: {
    total,
    successful,
    failed: total - successful,
    successRate: \`\${Math.round((successful / total) * 100)}%\`
  },
  results
};`
  }
];

export default exampleScripts;