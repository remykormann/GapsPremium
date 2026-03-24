(function () { 
    if (location.hostname.includes("login.eduid.ch")) {
        hidePage();
    }
    let EMAIL;
    let PASSWORD;
    
    const storage = typeof browser !== "undefined"
    ? browser.storage.local
    : chrome.storage.local;
    
    storage.get(["gaps_email", "gaps_password"], (data) => {
        
        EMAIL = data.gaps_email;
        PASSWORD = data.gaps_password;
        
        startAutoLogin();
    });
    
    function showPage() {
        document.documentElement.style.visibility = "visible";
    }

    function hidePage() {
        document.documentElement.style.visibility = "hidden";
        setTimeout(showPage, 3000);
    }
    
    function saveCredentials() {
        
        const email = document.querySelector('input[type="email"], input[name="j_username"], #username')?.value;
        const password = document.querySelector('input[type="password"]')?.value;
        
        if (!email || !password) return;
        
        storage.set({
            gaps_email: email,
            gaps_password: password
        });
    }
    
    function tryLogin() {
        if (sessionStorage.getItem("gaps_tried")) return;
        
        if (location.hostname.includes("login.eduid.ch")) {
            if(!EMAIL || !PASSWORD) {
                sessionStorage.removeItem("gaps_tried");
                showPage();
                return;
            }
            
            const emailInput = document.querySelector('input[type="email"], input[name="j_username"], #username');
            const passwordInput = document.querySelector('input[type="password"]');
            
            if (emailInput && !passwordInput) {
                emailInput.value = EMAIL;
                document.querySelector("#button-submit")?.click();
                //si on reste sur la page on suprime les credentials pour éviter de se faire bloquer
                setTimeout(() => {
                    storage.remove(["gaps_email", "gaps_password"]);
                    showPage();
                }, 1500);
                return;
            }

            if (passwordInput) {
                sessionStorage.setItem("gaps_tried", "1");
                passwordInput.value = PASSWORD;
                let tries = 0;
                const wait = setInterval(() => {
                    tries++;
                    if (tries > 50) clearInterval(wait);
                    const btn = document.querySelector("#button-proceed");
                    if (btn && !btn.disabled) {
                        btn.click();
                        clearInterval(wait);
                    }
                }, 100);
                //si on reste sur la page après 1 seconde on suprime les credentials pour éviter de se faire bloquer
                setTimeout(() => {
                    storage.remove(["gaps_email", "gaps_password"]);
                    showPage();
                }, 1500);
                return;
            }
        }

        if (location.hostname.includes("gaps.heig-vd.ch")) {

            const select = document.querySelector("select.userIdPSelection");

            if (select) {
                select.selectedIndex = 1;
                select.closest("form")?.submit();
            }else{
                sessionStorage.removeItem("gaps_tried");
                showPage();
            }
        }
    }

    function startAutoLogin() {
        setTimeout(tryLogin, 300);
    }

    document.addEventListener("click", (e) => {

        if (e.target.matches("#button-proceed")) {
            saveCredentials();
        }

    });

})();