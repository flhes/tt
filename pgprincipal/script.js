// Função para inicializar o banco de dados com stores para usuários e favoritos
function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("userDatabase", 2); // Atualização de versão para 2

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Store para os usuários
            if (!db.objectStoreNames.contains("users")) {
                const usersStore = db.createObjectStore("users", { keyPath: "usuario" });
                usersStore.createIndex("usuario", "usuario", { unique: true });
            }

            // Store para os favoritos
            if (!db.objectStoreNames.contains("favorites")) {
                const favoritesStore = db.createObjectStore("favorites", { keyPath: ["usuario", "bookName"] });
                favoritesStore.createIndex("usuario", "usuario", { unique: false });
            }
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

// Função para adicionar ou remover um favorito
async function toggleFavorite(bookName) {
    const loggedInUser = localStorage.getItem("loggedInUser");
    if (!loggedInUser) {
        alert("Nenhum usuário logado");
        return;
    }

    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("favorites", "readwrite");
        const store = transaction.objectStore("favorites");

        // Tenta recuperar o favorito para verificar se ele já existe
        const request = store.get([loggedInUser, bookName]);
        request.onsuccess = () => {
            if (request.result) {
                // Remove dos favoritos
                store.delete([loggedInUser, bookName]);
                resolve("Favorito removido com sucesso");
            } else {
                // Adiciona aos favoritos
                store.add({ usuario: loggedInUser, bookName });
                resolve("Favorito adicionado com sucesso");
            }
        };
        request.onerror = () => {
            reject("Erro ao atualizar favoritos");
        };
    });
}

// Função para obter os favoritos do usuário logado
async function getFavorites() {
    const loggedInUser = localStorage.getItem("loggedInUser");
    if (!loggedInUser) {
        alert("Nenhum usuário logado");
        return [];
    }

    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("favorites", "readonly");
        const store = transaction.objectStore("favorites");
        const index = store.index("usuario");
        const request = index.getAll(loggedInUser);

        request.onsuccess = () => {
            resolve(request.result.map(fav => fav.bookName));
        };

        request.onerror = () => {
            reject("Erro ao recuperar favoritos");
        };
    });
}

// Event listeners para gerenciar os favoritos e filtros
document.addEventListener("DOMContentLoaded", async function() {
    const filterSelect = document.getElementById("book-filter");
    const searchInput = document.getElementById("search-bar");
    const books = document.querySelectorAll(".book");
    const showFavoritesButton = document.getElementById("show-favorites");

    // Carrega os favoritos do usuário logado ao iniciar
    let favorites = await getFavorites();

    // Filtro por gênero
    filterSelect.addEventListener("change", function() {
        filterBooks();
    });

    // Busca por nome do livro
    searchInput.addEventListener("input", function() {
        filterBooks();
    });

    // Adicionar ou remover livro dos favoritos
    document.querySelectorAll(".favorite-button").forEach(button => {
        const book = button.closest(".book");
        const bookName = book.getAttribute("data-name");

        // Atualiza o botão com base no estado dos favoritos
        button.textContent = favorites.includes(bookName) ? "Remover dos Favoritos" : "Adicionar aos Favoritos";

        button.addEventListener("click", async function(event) {
            try {
                const message = await toggleFavorite(bookName);
                alert(message);

                // Atualiza a lista de favoritos e o texto do botão
                favorites = await getFavorites();
                button.textContent = favorites.includes(bookName) ? "Remover dos Favoritos" : "Adicionar aos Favoritos";
            } catch (error) {
                alert(error);
            }
        });
    });

    // Exibir livros favoritos ao clicar no botão de favoritos
    showFavoritesButton.addEventListener("click", function() {
        books.forEach(book => {
            const bookName = book.getAttribute("data-name");

            if (favorites.includes(bookName)) {
                book.style.display = "block";
            } else {
                book.style.display = "none";
            }
        });
    });

    // Função de filtro de livros
    function filterBooks() {
        const filter = filterSelect.value.toLowerCase();
        const searchText = searchInput.value.toLowerCase();

        books.forEach(book => {
            const bookType = book.getAttribute("data-type");
            const bookName = book.getAttribute("data-name").toLowerCase();

            if ((filter === "todos" || bookType === filter) && bookName.includes(searchText)) {
                book.style.display = "block";
            } else {
                book.style.display = "none";
            }
        });
    }
});
