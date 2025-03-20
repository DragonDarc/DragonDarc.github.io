// ฟังก์ชัน scroll ขึ้นไปด้านบน
document.addEventListener("DOMContentLoaded", function () {
    const scrollTopBtn = document.getElementById("scrollTopBtn");

    window.addEventListener("scroll", function () {
        if (window.scrollY > 300) {
            scrollTopBtn.classList.add("show");
        } else {
            scrollTopBtn.classList.remove("show");
        }
    });

    scrollTopBtn.addEventListener("click", function () {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });
});

// ทำให้คลิกรูปภาพได้
document.querySelectorAll('.gallery img').forEach(img => {
    img.addEventListener('click', function() {
        document.getElementById('lightbox-img').src = this.src;
        document.getElementById('lightbox').style.display = 'flex';
    });
});

document.querySelector('.close').addEventListener('click', function() {
    document.getElementById('lightbox').style.display = 'none';
});

document.getElementById('lightbox').addEventListener('click', function(e) {
    if (e.target !== document.getElementById('lightbox-img')) {
        document.getElementById('lightbox').style.display = 'none';
    }
});
