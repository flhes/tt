// Função para inicializar o banco de dados
function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("VestBookDB", 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Criação da store de usuários
            const usersStore = db.createObjectStore("users", { keyPath: "usuario" });
            usersStore.createIndex("usuario", "usuario", { unique: true });

            // Criação da store de favoritos
            const favoritesStore = db.createObjectStore("favorites", { keyPath: ["usuario", "bookName"] });
            favoritesStore.createIndex("usuario", "usuario", { unique: false });

            console.log('Banco de dados inicializado com sucesso!');
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error("Erro ao abrir o banco de dados", event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}

// Função para obter todos os usuários
async function getUsuarios() {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("users", "readonly");
        const store = transaction.objectStore("users");
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject("Erro ao recuperar usuários");
        };
    });
}

// Função para salvar um novo usuário
async function saveUsuario(user) {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("users", "readwrite");
        const store = transaction.objectStore("users");
        const request = store.add(user);

        request.onsuccess = () => {
            resolve("Usuário registrado com sucesso");
        };

        request.onerror = () => {
            reject("Erro: Usuário já existe");
        };
    });
}

// Função para adicionar um favorito
async function addFavorito(usuario, bookName) {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("favorites", "readwrite");
        const store = transaction.objectStore("favorites");
        const request = store.add({ usuario, bookName });

        request.onsuccess = () => {
            resolve("Favorito adicionado com sucesso");
        };

        request.onerror = () => {
            reject("Erro ao adicionar favorito");
        };
    });
}

// Função para obter favoritos de um usuário
async function getFavoritos(usuario) {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("favorites", "readonly");
        const store = transaction.objectStore("favorites");
        const index = store.index("usuario");
        const request = index.openCursor(IDBKeyRange.only(usuario));

        const favoritos = [];
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                favoritos.push(cursor.value.bookName);
                cursor.continue();
            } else {
                resolve(favoritos);
            }
        };

        request.onerror = () => {
            reject("Erro ao recuperar favoritos");
        };
    });
}

// Evento para alternar entre o formulário de login e o de cadastro
document.getElementById('to-register').addEventListener('click', function() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('form-title').innerText = 'Cadastro';
});

document.getElementById('to-login').addEventListener('click', function() {
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('form-title').innerText = 'Login';
});

// Login
document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const user = document.getElementById('user').value;
    const senha = document.getElementById('senha').value;
    const usuarios = await getUsuarios();
    const loginValido = usuarios.some(u => u.usuario === user && u.senha === senha);

    if (loginValido) {
        alert('Login realizado com sucesso');
        localStorage.setItem("loggedInUser", user); // Armazena o usuário logado
        location.href = '../pgprincipal/index.html';
    } else {
        alert('Usuário ou senha incorretos');
    }
});

// Cadastro
document.getElementById('register-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const user = document.getElementById('register-user').value;
    const senha = document.getElementById('register-senha').value;

    try {
        await saveUsuario({ usuario: user, senha: senha });
        alert('Usuário registrado com sucesso');
        document.getElementById('to-login').click(); // Voltar para a tela de login
    } catch (error) {
        alert(error);
    }
});

// Funcionalidade para adicionar/remover favoritos de um livro
document.querySelectorAll(".favorite-button").forEach(button => {
    button.addEventListener("click", async function(event) {
        const book = event.target.closest(".book");
        const bookName = book.getAttribute("data-name");
        const loggedInUser = localStorage.getItem("loggedInUser");

        if (!loggedInUser) {
            alert("Por favor, faça login para adicionar aos favoritos.");
            return;
        }

        const favoritos = await getFavoritos(loggedInUser);

        if (favoritos.includes(bookName)) {
            alert(`${bookName} já está nos seus favoritos.`);
        } else {
            await addFavorito(loggedInUser, bookName);
            alert(`${bookName} foi adicionado aos seus favoritos.`);
        }
    });
});
