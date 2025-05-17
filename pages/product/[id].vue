<script lang="ts" setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from 'axios';
import 'cleave.js/dist/addons/cleave-phone.ru'; // Для поддержки русского формата

// Функция для форматирования числа в формат 99.999,00
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(price)
    .replace(/\s/g, '.'); // Заменяем пробелы на точки
};
const route = useRoute();
const router = useRouter();
const productId = route.params.id;
const { public: { apiBaseUrl } } = useRuntimeConfig()
const productImage = ref<string | null>(null);
const productName = ref("");
const productPrice = ref<number>(0);
const productDescription = ref("");

// Функция для загрузки данных товара из MongoDB
const fetchProduct = async () => {
  try {
    // Запрос к API для получения данных товара по его ID
    const response = await fetch(`${apiBaseUrl}/api/products/${productId}`);
    if (!response.ok) {
      throw new Error("Ошибка при получении товара");
    }

    // Парсинг данных из ответа
    const data = await response.json();

    // Заполнение реактивных переменных данными из MongoDB
    productName.value = data["product-name"];
    productPrice.value = data["product-price"];
    productDescription.value = data["product-description"];
    productImage.value = data["product-image"];
  } catch (error) {
    console.error("Ошибка при загрузке данных товара:", error);

    // Перенаправление на страницу администратора в случае ошибки
    await router.push("/");
  }
};

// Функция для добавления товара в корзину
const addToBasket = async () => {
    const userId = getOrCreateUserId(); // Получаем или создаем userId

    // Проверяем, что данные о товаре загружены
    if (!productName.value || !productPrice.value || !productImage.value) {
        console.error('Данные о товаре не загружены');
        return;
    }

    try {
        await axios.post(`${apiBaseUrl}/api/baskets/add`, {
            userId,
            'items-product-name': productName.value, // Используем productName
            'items-price': productPrice.value,       // Используем productPrice
            'items-product-image': productImage.value, // Используем productImage
            'items-quantity': 1, // По умолчанию добавляем 1 единицу товара
        });
        console.log('Товар добавлен в корзину:', productName.value);
        // Можно добавить уведомление или обновление состояния корзины
    } catch (error) {
        console.error('Ошибка при добавлении товара в корзину:', error);
    }
};

// Функция для получения или создания userId
const getOrCreateUserId = () => {
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('userId', userId);
    }
    return userId;
};

// Загружаем данные о товаре при монтировании компонента
onMounted(() => {
    fetchProduct();
});

const selectedVolume = ref('500мл');
</script>

<template>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Авто-химия</title>
    <link rel="icon" href="@/image/IcoL.ico" type="image/x-icon"/>
    <div class="GoBackBody">
        <NuxtLink to="/">
            <a class="BtnGoBack"><- назад</a>
        </NuxtLink>
    </div>
    <div class="PageProductBody">
        <div class="PageProductContent">
            <!-- Картинка -->
            <div class="PageImageProduct">
                <img v-if="productImage" style="width: 100%; height:100%; object-fit: cover;" :src="productImage" />
                <img v-else style="width: 100%; height:100%; object-fit: cover;" src="~/assets/image/ProductImage.png" />
            </div>
            <!-- Блок с названием товара, кнопкой и описанием -->
            <div class="PageProductRightBlock">
                <div class="PageProductText">
                    <div class="PageProductName">{{ productName }}</div>
                    <div class="PagePriceForOne">{{ formatPrice(productPrice) }} р/1шт</div>
                    <div class="PageButtonProductAdd">
                        <button class="PageBtnProductAdd" @click="addToBasket">Добавить в корзину</button>
                    </div>
                </div>
                <!-- Блок с описанием -->
                <div class="PageProductDescriptionBlock">
                    <div class="PageProductDescription">
                        {{ productDescription }}
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="PageFooterBody">
        <div class="PageFooterBodyContent">
            <div class="PageFooterContacts">
                <h2 class="FooterTitle">Краснодар:</h2>
                <div class="PageFooterTextContent">
                    <p class="FooterText">+7(928)660-97-79</p>
                    <p class="FooterText">+7(928)227-55-15</p>
                    <p class="FooterText">+7(967)660-09-51</p>
                    <p class="FooterText">+7(967)660-09-47</p>
                    <p class="FooterText gmail">info@himautopro.ru</p>
                </div>
            </div>
            <div class="PageFooterSocial">
                <div class="PageFooterSocialContent">
                    <div class="PageSocial">
                        <img src="~/assets/image/VK.png" style="width: 45px;" />
                        <img src="~/assets/image/Telegram.png" style="width: 45px;" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>