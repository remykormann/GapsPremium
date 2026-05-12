function openMenu(event) {
  const li = event.currentTarget;
  const ul = li.querySelector('ul');
  if (ul) ul.style.display = 'block';
}

function closeMenu(event) {
  const li = event.currentTarget;
  const ul = li.querySelector('ul');
  if (ul) ul.style.display = 'none';
}

function moveUp(li) {
  const prev = li.previousElementSibling;
  if (prev) {
    li.parentNode.insertBefore(li, prev);
  }
}

const ul = document.getElementsByClassName("ulroot")[0];

const li = document.createElement("li");
li.classList.add("submenu", "liroot");

// image
const img = document.createElement("img");
img.src = "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_48dp.png";
img.alt = "Drive";
img.style.width = "16px";
img.style.height = "16px";
img.style.marginRight = "6px";

// texte
const span = document.createElement("span");
span.textContent = "Drive";

// assemblage header
li.appendChild(img);
li.appendChild(span);

li.addEventListener('mouseenter', openMenu);
li.addEventListener('mouseleave', closeMenu);

// sous-menu
const ul2 = document.createElement("ul");
ul2.style.display = "none";

// Drive 1
const drive1 = document.createElement("li");
drive1.classList.add("link");
const a1 = document.createElement("a");
a1.title = "Drive 1";
a1.href = "https://drive.google.com/drive/folders/1wt4gqwGC-MylX4fi1QUB2yGa4w7ulghU";
a1.textContent = "Drive 1";
a1.target = "_blank";
a1.rel = "noopener noreferrer";
drive1.appendChild(a1);

// Drive 2
const drive2 = document.createElement("li");
drive2.classList.add("link");
const a2 = document.createElement("a");
a2.title = "Drive 2";
a2.href = "https://drive.google.com/drive/folders/1OWsxa-Di8ImZguZlzgeMBydoJ0To1AjZ";
a2.textContent = "Drive 2";
a2.target = "_blank";
a2.rel = "noopener noreferrer";
drive2.appendChild(a2);

// Drive 3
const drive3 = document.createElement("li");
drive3.classList.add("link");
const a3 = document.createElement("a");
a3.title = "Drive 3";
a3.href = "https://drive.google.com/drive/folders/1z-drrPImMtfvFh_pPn13O0eoVYXdb0oA";
a3.textContent = "Drive 3";
a3.target = "_blank";
a3.rel = "noopener noreferrer";
drive3.appendChild(a3);

// assemblage menu
ul2.appendChild(drive1);
ul2.appendChild(drive2);
ul2.appendChild(drive3);
li.appendChild(ul2);
ul.appendChild(li);

// remonte d'une position
moveUp(li);


