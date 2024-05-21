import { formatTime, wb_img_url } from "./base_template.js";

/* КАК ТЕСТИТЬ ЛОКАЛЬНО?
 * 1. Сохраняем JSON у себя (например stoks.json)
 * 2. В функции  fetchWithTimeout меняем путь
 * У ВЕРСИИ ПРОДАКШЕНА (где мы берем РЕАЛЬНЫЕ ДАННЫЕ, а не статический JSON)
 * путь будет '/stocks'
 * А ВОТ ЧТОБЫ тестировать БЕЗ сервера путь будет '/static/js/stoks.json'
 *
 *
 * Почему это надо?
 * Потому что если локально запускать файл, но не менять путь, то табличка
 * не отрисуется. Нужно обращаться прям к файлику.
 * Вот такой вот костыль.
 *  */

document.addEventListener("DOMContentLoaded", () => {
  fetchDataAndRenderTable();
});

function fetchDataAndRenderTable() {
  let actionValue = null;

  const fetchButton = document.getElementById("fetchButton");
  if (fetchButton && fetchButton.dataset.clicked === "true") {
    actionValue = "get_data";
  }
  fetchButton.disabled = true;

  const loader = document.querySelector(".loader");
  if (loader) {
    loader.style.display = "block";
  }

  const mainElement = document.querySelector(".table");
  mainElement.classList.add("loading");

  const errortext = document.getElementById("errortext");
  if (errortext) {
    errortext.style.display = "none";
  }

  //параметры fetch
  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Fetch POST Request Example",
      action: actionValue,
    }),
  };

  // Отдельно определяем опцию тайм-аута
  const fetchOptions = {
    ...requestOptions,
    timeout: 10000, // 10 секунд
  };

  /*
   * Почему timeout отдельно?
   * Это не стандартная опция для объекта запроса в Fetch API
   * Обычно его указывают непосредственно в fetch
   */

  function fetchWithTimeout(url, options, timeout) {
    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), timeout)
      ),
    ]);
  }

  // Функция для создания таблицы на основе данных и заголовков
  fetchWithTimeout("./stoks.json", fetchOptions, 1000)
    .then((response) => response.json())
    .then((data) => {
      if (loader) {
        loader.style.display = "none";
      }
      if (fetchButton) {
        fetchButton.style.display = "block";
        fetchButton.disabled = false;
      }

      // Время обновления
      const maxH12 = Math.max(
        ...Object.values(data.tabledata).map((item) => parseInt(item.h12, 10))
      );

      const formattedTime = formatTime(maxH12);
      // Выводим отформатированное время
      document.getElementById(
        "updateTimeText"
      ).textContent = `Обновлено: ${formattedTime}`;

      const existingTable = document.querySelector(".table table");
      if (existingTable) {
        existingTable.remove();
      }

      // Создаем таблицу и добавляем ее, убираем класс лоадинг
      mainElement.classList.remove("loading");
      const table = document.createElement("table");
      table.id = "mainTable";
      mainElement.appendChild(table);

      // Создаем заголовки столбцов
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      const headers = [
        "Фото",
        "Категория",
        "Бренд",
        "Артикул",
        "Остаток общий",
      ];
      headers.forEach((headerText) => {
        const th = document.createElement("th");
        th.textContent = headerText;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Создаем тело таблицы и заполняем данными
      const tbody = document.createElement("tbody");

      // Группируем данные по артикулам
      const groupedData = {};
      for (const key in data.tabledata) {
        const rowData = data.tabledata[key];
        if (!groupedData[rowData.h1]) {
          groupedData[rowData.h1] = [];
        }
        groupedData[rowData.h1].push(rowData);
      }

      // Создаем строки для каждого артикула
      for (const articul in groupedData) {
        const articulData = groupedData[articul];

        // Создаем строку об артикуле
        const articulRow = document.createElement("tr");
        const photoCell = document.createElement("td");

        // Создаем элемент <img> и устанавливаем его атрибут src с использованием функции wb_img_url
        const image = document.createElement("img");
        image.src = `https:${wb_img_url(articul)}/images/big/1.jpg`;

        // Добавляем изображение в ячейку
        photoCell.appendChild(image);
        articulRow.appendChild(photoCell);

        // Категория
        const category = articulData[0].h8;
        const h11Value = articulData[0].h11;
        const concatenatedValue = category + " / " + h11Value;

        const categoryCell = document.createElement("td");
        categoryCell.textContent = concatenatedValue;
        articulRow.appendChild(categoryCell);

        // Бренд
        const brand = articulData[0].h10;
        const brandValue = brand;

        const brandCell = document.createElement("td");
        if (brand === "") {
          brandCell.textContent = "нет бренда";
        } else {
          brandCell.textContent = brandValue;
        }
        articulRow.appendChild(brandCell);

        // Артикул
        const articleText = articul + " / " + articulData[0].h9;
        const articleCell = document.createElement("td");
        articleCell.textContent = articleText;
        articulRow.appendChild(articleCell);

        // Вычисляем сумму значений из всех h7 в JSON для данного артикула
        const totalStockCell = document.createElement("td");
        const totalStockValue = articulData.reduce((sum, row) => {
          sum += parseInt(row.h7);
          return sum;
        }, 0);
        totalStockCell.textContent = totalStockValue;
        articulRow.appendChild(totalStockCell);

        tbody.appendChild(articulRow);

        // Создаем подтаблицу
        const subTable = document.createElement("table");
        const subTbody = document.createElement("tbody");

        // Заголовки столбцов в подтаблице
        const subHeaderRow = document.createElement("tr");
        subHeaderRow.classList.add("subHeaderRow");
        const subHeaders = [
          "Размер",
          "Склад",
          "Остаток",
          "К клиенту",
          "От клиента",
          "Количество",
        ];
        subHeaders.forEach((headerText) => {
          const th = document.createElement("th");
          th.textContent = headerText;
          subHeaderRow.appendChild(th);
        });
        subTbody.appendChild(subHeaderRow);

        // Преобразуем размеры в числа и сортируем данные по размерам
        articulData.sort((a, b) => parseFloat(a.h2) - parseFloat(b.h2));

        // Создаем строки для каждого артикула
        articulData.forEach((rowData) => {
          const subRow = document.createElement("tr");
          const sizeCell = document.createElement("td");
          sizeCell.textContent = rowData.h2;
          subRow.appendChild(sizeCell);
          const warehouseCell = document.createElement("td");
          warehouseCell.textContent = rowData.h3;
          subRow.appendChild(warehouseCell);
          const stockCell = document.createElement("td");
          stockCell.textContent = rowData.h4;
          subRow.appendChild(stockCell);
          const toCustomerCell = document.createElement("td");
          toCustomerCell.textContent = rowData.h5;
          subRow.appendChild(toCustomerCell);
          const fromCustomerCell = document.createElement("td");
          fromCustomerCell.textContent = rowData.h6;
          subRow.appendChild(fromCustomerCell);
          const quantityCell = document.createElement("td");
          quantityCell.textContent = rowData.h7;
          subRow.appendChild(quantityCell);
          subTbody.appendChild(subRow);
        });

        subTable.appendChild(subTbody);

        // Добавьте атрибут colspan="5" к ячейке с подтаблицей
        const subTableCell = document.createElement("td");
        subTableCell.colSpan = 5; // Устанавливаем colspan на 4
        subTableCell.appendChild(subTable);

        const subTableRow = document.createElement("tr");
        subTableRow.classList.add("SubTable");
        subTableRow.appendChild(subTableCell);
        tbody.appendChild(subTableRow);
      }

      table.appendChild(tbody);
    })
    .catch((error) => {
      mainElement.classList.remove("loading");
      if (loader) {
        loader.style.display = "none";
      }
      console.error("Произошла ошибка при загрузке данных:", error);

      if (errortext) {
        errortext.style.display = "block";
      }
      if (fetchButton) {
        fetchButton.style.display = "none";
        // fetchButton.style.visibility = "hidden";
        fetchButton.style.opacity = "0";
      }
    });
}

document.getElementById("fetchButton").addEventListener("click", () => {
  const fetchButton = document.getElementById("fetchButton");
  if (fetchButton) {
    fetchButton.dataset.clicked = "true";
  }

  fetchDataAndRenderTable(); // Вызываем функцию при клике на кнопку
});
