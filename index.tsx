import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz4hKNgQCElUaM7ShRFSka1bjGnNqVPdOTHrGgbz2fmxrro1oroSeiu_QwPetGtGNBC/exec";

interface MenuItem {
    name: string;
    price: number;
}

interface CartItem {
    name: string;
    price: number;
    note: string;
    quantity: number;
    isNoteOpen: boolean; 
}

const MENU: MenuItem[] = [
    { name: "Chè Bưởi", price: 15000 }, { name: "Chè Đậu Đỏ", price: 15000 }, { name: "Chè Đậu Đen", price: 15000 },
    { name: "Chè Đậu Xanh", price: 15000 }, { name: "Chè Thập Cẩm", price: 15000 }, { name: "Chè Ngô Cốt Dừa", price: 15000 },
    { name: "Chè Cốm Dừa Non", price: 15000 }, { name: "Chè Dừa Dầm", price: 15000 }, { name: "Chè Khoai Dẻo", price: 15000 },
    { name: "Chè Tuổi Thơ", price: 15000 }, { name: "Sương Sa Hạt Lựu", price: 15000 }, { name: "SC Trân Châu", price: 15000 },
    { name: "Thập Cẩm ĐB", price: 20000 }, { name: "Sữa Chua Mít", price: 20000 }, { name: "SC Dừa Non", price: 20000 },
    { name: "SC Cốm Dừa Non", price: 20000 }, { name: "Chè Sầu", price: 25000 }, { name: "Sầu Riêng Đ.Xanh", price: 25000 },
    { name: "Chè Hạt Đác", price: 25000 }, { name: "SC Mít Hạt Đác", price: 25000 }, { name: "Chè Thốt Nốt", price: 25000 },
    { name: "SC Mít Sầu Riêng", price: 35000 }
];

const formatK = (price: number) => (price / 1000) + "k";

const App = () => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
    
    // UI State
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [showPasswordChars, setShowPasswordChars] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [toastMessage, setToastMessage] = useState("");

    // Print Configuration State
    const [showPrintConfig, setShowPrintConfig] = useState(false);
    const [printConfig, setPrintConfig] = useState({ width: 50, height: 30 }); // Default 50mm x 30mm
    
    // Stats State
    const [stats, setStats] = useState({ today: 0, month: 0, year: 0, count: 0 });
    const [currentTab, setCurrentTab] = useState("today");
    const [isLoading, setIsLoading] = useState(false);
    const [statsDisplay, setStatsDisplay] = useState({ value: "0k", label: "Doanh thu Hôm nay", color: "#1565c0" });
    const [customDate, setCustomDate] = useState("");
    const [globalPassword, setGlobalPassword] = useState("");

    // Refs
    const cartListRef = useRef<HTMLDivElement>(null);
    const noteInputsRef = useRef<Record<number, HTMLInputElement | null>>({});

    // Load print config from localStorage on mount
    useEffect(() => {
        const savedConfig = localStorage.getItem('printConfig');
        if (savedConfig) {
            try {
                setPrintConfig(JSON.parse(savedConfig));
            } catch (e) { console.error("Error loading config", e); }
        }
    }, []);

    // Filter Menu Logic
    const filteredMenu = MENU.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const isSearchMode = searchTerm.length > 0;

    // Effect to auto-scroll cart
    useEffect(() => {
        if (cartListRef.current) {
            cartListRef.current.scrollTop = cartListRef.current.scrollHeight;
        }
    }, [cart.length]);

    // Effect to handle Accordion Search Mode
    useEffect(() => {
        if (isSearchMode) {
            setOpenSections({ "15k": true, "20k": true, "high": true });
        } else {
            if(Object.keys(openSections).length === 3) {
                 setOpenSections({ "15k": true });
            }
        }
    }, [isSearchMode]);

    useEffect(() => {
        if (!showStatsModal) return;
        
        if (currentTab === 'today') {
            setStatsDisplay({ value: formatK(stats.today), label: "Doanh thu Hôm nay", color: "#1565c0" });
        } else if (currentTab === 'month') {
            setStatsDisplay({ value: formatK(stats.month), label: "Doanh thu Tháng này", color: "#2e7d32" });
        } else if (currentTab === 'year') {
            setStatsDisplay({ value: formatK(stats.year), label: "Doanh thu Năm nay", color: "#c62828" });
        } else if (currentTab === 'custom') {
             setStatsDisplay({ value: "---", label: "Chọn ngày để xem", color: "#ff9800" });
        }
    }, [currentTab, stats, showStatsModal]);

    // --- ACTIONS ---

    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existingIndex = prev.findIndex(i => i.name === item.name && i.note === "" && !i.isNoteOpen);
            if (existingIndex !== -1) {
                const newCart = [...prev];
                newCart[existingIndex].quantity += 1;
                return newCart;
            }
            return [...prev, { ...item, note: "", quantity: 1, isNoteOpen: false }];
        });
        setSearchTerm("");
    };

    const changeQty = (index: number, delta: number) => {
        setCart(prev => {
            const newCart = [...prev];
            newCart[index].quantity += delta;
            if (newCart[index].quantity <= 0) {
                newCart.splice(index, 1);
            }
            return newCart;
        });
    };

    const handleDirectQtyChange = (index: number, valStr: string) => {
        if (valStr === "") {
            setCart(prev => {
                const newCart = [...prev];
                // @ts-ignore
                newCart[index].quantity = ""; 
                return newCart;
            });
            return;
        }

        const num = parseInt(valStr);
        if (!isNaN(num)) {
            setCart(prev => {
                const newCart = [...prev];
                newCart[index].quantity = num;
                return newCart;
            });
        }
    };

    const handleQtyBlur = (index: number) => {
        setCart(prev => {
            const newCart = [...prev];
            if (!newCart[index].quantity || newCart[index].quantity < 1) {
                newCart[index].quantity = 1;
            }
            return newCart;
        });
    };

    const removeLine = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    const clearCart = () => {
        setCart([]);
        setSearchTerm("");
    };

    const updateNote = (index: number, val: string) => {
        setCart(prev => {
            const newCart = [...prev];
            newCart[index].note = val;
            return newCart;
        });
    };

    const toggleNote = (index: number, isChecked: boolean) => {
        if (isChecked) {
            const item = cart[index];
            if (item.quantity > 1) {
                setCart(prev => {
                    const newCart = [...prev];
                    newCart[index].quantity -= 1;
                    
                    const newItem: CartItem = { 
                        name: item.name, 
                        price: item.price, 
                        note: "", 
                        quantity: 1, 
                        isNoteOpen: true 
                    };
                    newCart.splice(index + 1, 0, newItem);
                    return newCart;
                });
                
                setTimeout(() => {
                    const nextInput = noteInputsRef.current[index + 1];
                    if (nextInput) nextInput.focus();
                }, 50);
            } else {
                 setCart(prev => {
                    const newCart = [...prev];
                    newCart[index].isNoteOpen = true;
                    return newCart;
                 });
                 setTimeout(() => {
                    const input = noteInputsRef.current[index];
                    if (input) input.focus();
                 }, 50);
            }
        } else {
            setCart(prev => {
                const newCart = [...prev];
                newCart[index].isNoteOpen = false;
                newCart[index].note = "";
                return newCart;
            });
        }
    };

    const toggleSection = (key: string) => {
        setOpenSections(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const savePrintConfig = () => {
        localStorage.setItem('printConfig', JSON.stringify(printConfig));
        setShowPrintConfig(false);
    };

    // --- PRINT & SAVE ---

    const showToast = () => {
        setToastMessage("Đã lưu vào Google Sheet!");
        setTimeout(() => setToastMessage(""), 3000);
    };

    const sendToGoogleSheet = (totalMoney: number) => {
        const orderDetails = cart.map(item => `(${item.quantity}) ${item.name} ${item.note ? '[' + item.note + ']' : ''}`).join(", ");
        const data = { action: 'save', order_details: orderDetails, total_money: totalMoney };
        
        fetch(GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(() => showToast())
        .catch(err => console.error(err));
    };

    // --- HÀM IN ẤN ĐÃ ĐƯỢC SỬA LỖI ---
    const processPrintAndSave = () => {
        let totalMoney = 0;
        cart.forEach(i => totalMoney += (i.price * (Number(i.quantity) || 0)));
        
        // 1. KHÔNG đóng modal UI ngay ở đây. 
        // iOS cần giữ tương tác user (modal đang mở) cho đến khi lệnh in thực sự được gọi.
        // CSS @media print sẽ lo việc ẩn UI đi.

        const printSection = document.getElementById('print-section');
        if (!printSection) return;

        // 2. Chuẩn bị CSS
        let styleTag = document.getElementById('dynamic-print-style');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'dynamic-print-style';
            document.head.appendChild(styleTag);
        }

        // SỬA LỖI IN 100 TEM VÀO 1 TRANG:
        // Dùng position: relative thay vì absolute.
        // Dùng break-after: page cho từng tem.
        styleTag.innerHTML = `
            @media print {
                @page {
                    margin: 0 !important;
                    size: ${printConfig.width}mm ${printConfig.height}mm;
                }
                html, body {
                    width: 100%;
                    height: 100%;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #fff !important;
                }
                /* Ẩn hoàn toàn giao diện App */
                #ui-container, .modal-overlay, #toast { 
                    display: none !important; 
                }
                /* Hiển thị vùng in */
                #print-section {
                    display: block !important;
                    position: relative !important; /* QUAN TRỌNG: Fix lỗi dồn trang */
                    width: ${printConfig.width}mm !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #fff !important;
                }
                .sticker {
                    width: ${printConfig.width}mm;
                    height: ${printConfig.height}mm;
                    
                    /* Ngắt trang chuẩn */
                    page-break-after: always;
                    break-after: page;
                    break-inside: avoid;
                    
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    overflow: hidden;
                    padding: 1mm;
                    box-sizing: border-box;
                    border: none;
                }
                .sticker-name {
                    font-size: 18px; 
                    font-weight: 900;
                    text-transform: uppercase;
                    text-align: center;
                    line-height: 1.1;
                    width: 100%;
                    word-wrap: break-word;
                }
                .sticker-custom-note {
                    margin-top: 2px;
                    font-size: 14px;
                    font-weight: bold;
                    background: #000;
                    color: #fff !important;
                    padding: 2px 6px;
                    border-radius: 4px;
                    text-align: center;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                    max-width: 100%;
                }
            }
        `;

        // 3. Chuẩn bị HTML
        printSection.innerHTML = '';
        let printHTML = '';
        cart.forEach(item => {
            const notePart = (item.note && item.note.trim() !== "") 
                ? `<div class="sticker-custom-note">${item.note}</div>` 
                : '';
            const qty = Number(item.quantity) || 0;
            for (let q = 0; q < qty; q++) {
                printHTML += `<div class="sticker">
                    <div class="sticker-name">${item.name}</div>
                    ${notePart}
                </div>`;
            }
        });
        printSection.innerHTML = printHTML;

        // 4. GỌI LỆNH IN
        // Sử dụng requestAnimationFrame để đảm bảo browser đã render xong tem mới gọi in
        requestAnimationFrame(() => {
            setTimeout(() => {
                window.print();
                
                // 5. Xử lý sau khi in (Bây giờ mới đóng Modal)
                setTimeout(() => {
                    const isPrinted = window.confirm("🖨️ XÁC NHẬN:\n\nBạn đã in phiếu thành công chưa?\n\n- [OK] để LƯU DOANH THU & XÓA ĐƠN.\n- [Cancel] nếu bạn hủy in.");
                    
                    if (isPrinted) {
                        sendToGoogleSheet(totalMoney);
                        clearCart();
                        setShowConfirmModal(false); // Đóng modal ở đây
                    } else {
                        // Nếu hủy in thì giữ nguyên modal để user có thể bấm in lại
                    }
                    // Dọn dẹp DOM in
                    printSection.innerHTML = ''; 
                }, 500);
            }, 50);
        });
    };

    // --- STATS ---

    const handleAskPassword = () => {
        setPasswordInput("");
        setShowPasswordChars(false);
        setPasswordError("");
        setShowPasswordModal(true);
    };

    const handlePasswordSubmit = () => {
        setPasswordError("");
        
        if (!passwordInput.trim()) {
            setPasswordError("Vui lòng nhập mật khẩu!");
            return;
        }

        const pass = passwordInput;
        setIsLoading(true); 
        
        fetch(GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'get_stats', password: pass })
        })
        .then(response => response.json())
        .then(result => {
            setIsLoading(false);
            if (result.result === "success") {
                setShowPasswordModal(false);
                setGlobalPassword(pass);
                setStats(result);
                setCurrentTab('today');
                setShowStatsModal(true);
            } else {
                setPasswordError("Mật khẩu không đúng!");
            }
        })
        .catch(error => {
            setIsLoading(false);
            setPasswordError("Lỗi kết nối mạng!");
        });
    };

    const lookupDate = () => {
        if (!customDate) { alert("Vui lòng chọn ngày!"); return; }
        
        setStatsDisplay(prev => ({ ...prev, value: "...", label: "Đang tra cứu..." }));
        
        fetch(GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'check_date', password: globalPassword, target_date: customDate })
        })
        .then(response => response.json())
        .then(result => {
            if (result.result === "success") {
                const parts = customDate.split("-");
                const niceDate = parts[2] + "/" + parts[1] + "/" + parts[0];
                setStatsDisplay({
                    value: formatK(result.total),
                    label: "Doanh thu ngày " + niceDate,
                    color: "#ff9800"
                });
            } else {
                alert("Lỗi: " + result.msg);
            }
        })
        .catch(err => alert("Lỗi tra cứu: " + err));
    };

    // --- RENDER HELPERS ---

    const renderMenuSection = (items: MenuItem[], bgClass: string, title: string, key: string) => {
        if (items.length === 0) return null;
        const isOpen = openSections[key];
        
        return (
            <div className={`menu-section ${bgClass}`} key={key}>
                <div className="section-title" onClick={() => toggleSection(key)}>
                    <span>{title}</span>
                    <span className="toggle-icon">{isOpen ? '▼' : '▶'}</span>
                </div>
                <div className="group-grid" style={{ display: isOpen ? 'grid' : 'none' }}>
                    {items.map((item, idx) => (
                        <div key={idx} className="btn-che" onClick={() => addToCart(item)}>
                            <span className="che-name">{item.name}</span>
                            <span className="che-price">{formatK(item.price)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * (Number(item.quantity) || 0)), 0);
    const cartCount = cart.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);

    return (
        <React.Fragment>
            <div id="ui-container">
                {/* TOP BAR */}
                <div id="top-bar">
                    <input 
                        type="text" 
                        id="search-box" 
                        placeholder="🔍 Tìm món nhanh..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button 
                        type="button"
                        className="btn-stats-icon" 
                        onClick={handleAskPassword} 
                        title="Thống kê"
                    >
                        📊
                    </button>
                </div>

                {/* MAIN SPLIT VIEW */}
                <div id="main-split-view">
                    {/* LEFT PANEL */}
                    <div id="left-panel">
                        <div id="menu-area">
                            {renderMenuSection(filteredMenu.filter(i => i.price === 15000), 'bg-15k', '15K - ĐỒNG GIÁ', '15k')}
                            {renderMenuSection(filteredMenu.filter(i => i.price === 20000), 'bg-20k', '20K - ĐỒNG GIÁ', '20k')}
                            {renderMenuSection(filteredMenu.filter(i => i.price >= 25000), 'bg-high', '25K+ (CAO CẤP)', 'high')}
                        </div>
                    </div>

                    {/* RIGHT PANEL */}
                    <div id="right-panel">
                        <div id="cart-container">
                            <div id="cart-header">
                                <span>🛒 Đơn đang chọn</span>
                                <span id="count-display">
                                    {cartCount} món
                                </span>
                            </div>
                            <div id="cart-list" ref={cartListRef}>
                                {cart.length === 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', gap: '10px' }}>
                                        <div style={{ fontSize: '40px', opacity: 0.5 }}>🥗</div>
                                        <div style={{ fontSize: '13px', fontStyle: 'italic' }}>Chưa có món nào</div>
                                    </div>
                                ) : (
                                    cart.map((item, i) => {
                                        return (
                                            <div className="cart-item" key={i}>
                                                <div className="item-row-top">
                                                    <div className="item-left">
                                                        <span className="item-name">{item.name}</span>
                                                        <span className="item-price-single">{formatK(item.price)}</span>
                                                    </div>
                                                    <div className="item-right">
                                                        {/* QUANTITY GROUP */}
                                                        <div className="qty-group">
                                                            <div className="qty-btn" onClick={() => changeQty(i, -1)}>-</div>
                                                            <input 
                                                                type="number"
                                                                className="qty-input"
                                                                value={item.quantity}
                                                                onChange={(e) => handleDirectQtyChange(i, e.target.value)}
                                                                onBlur={() => handleQtyBlur(i)}
                                                            />
                                                            <div className="qty-btn" onClick={() => changeQty(i, 1)}>+</div>
                                                        </div>
                                                        
                                                        {/* DELETE BTN - SEPARATED */}
                                                        <div className="delete-btn" onClick={() => removeLine(i)}>✕</div>
                                                    </div>
                                                </div>
                                                <div className="option-row">
                                                    <label className="label-note">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={item.isNoteOpen} 
                                                            onChange={(e) => toggleNote(i, e.target.checked)}
                                                            style={{ marginRight: '6px', width: '16px', height: '16px' }} 
                                                        /> 
                                                        Thêm ghi chú
                                                    </label>
                                                </div>
                                                {item.isNoteOpen && (
                                                    <div style={{ display: 'block' }}>
                                                        <input 
                                                            type="text" 
                                                            className="note-input" 
                                                            placeholder="Ví dụ: Ít ngọt, nhiều đá..." 
                                                            value={item.note} 
                                                            ref={(el) => { noteInputsRef.current[i] = el; }}
                                                            onChange={(e) => updateNote(i, e.target.value)}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>

                        <div id="bottom-controls">
                            <div id="total-bar">
                                <span style={{fontSize: '13px', color: '#64748b', fontWeight: 'bold'}}>TỔNG THANH TOÁN</span>
                                <span id="total-price">{formatK(cartTotal)}</span>
                            </div>
                            <div className="action-row">
                                <button id="btn-clear" className="action-btn" onClick={clearCart}>
                                    🗑️ Xóa
                                </button>
                                <button id="btn-print" className="action-btn" onClick={() => cart.length > 0 ? setShowConfirmModal(true) : alert("Chưa chọn món nào!")}>
                                    🖨️ IN & LƯU
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CONFIRM MODAL */}
                {showConfirmModal && (
                    <div id="confirm-modal" className="modal-overlay">
                        <div className="modal-box">
                            {!showPrintConfig ? (
                                <>
                                    <div className="modal-title">XÁC NHẬN ĐƠN HÀNG</div>
                                    <div className="confirm-list">
                                        {cart.map((item, idx) => (
                                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '8px'}} key={idx}>
                                                <div style={{ flex: 1 }}>
                                                    <b style={{marginRight: '5px'}}>x{item.quantity}</b> {item.name} 
                                                    {item.note && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '2px' }}>Note: {item.note}</div>}
                                                </div>
                                                <div style={{ fontWeight: 'bold' }}>{formatK(item.price * (Number(item.quantity) || 0))}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{textAlign: 'right', fontSize: '20px', fontWeight: '900', color: '#3b82f6', margin: '16px 0'}}>Tổng: {formatK(cartTotal)}</div>
                                    
                                    {/* Print Settings Link */}
                                    <div style={{textAlign: 'center', marginBottom: '16px'}}>
                                        <span 
                                            onClick={() => setShowPrintConfig(true)}
                                            style={{ color: '#64748b', fontSize: '13px', textDecoration: 'underline', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                        >
                                            ⚙️ Cấu hình khổ giấy in ({printConfig.width}x{printConfig.height}mm)
                                        </span>
                                    </div>

                                    <div style={{display: 'flex', gap: '12px'}}>
                                        <button className="modal-btn btn-cancel" style={{flex: 1, padding: '12px', border: 'none', borderRadius: '12px', background: '#f1f5f9', fontWeight: 'bold', color: '#64748b'}} onClick={() => setShowConfirmModal(false)}>Quay lại</button>
                                        <button className="modal-btn btn-confirm" style={{flex: 1, padding: '12px', border: 'none', borderRadius: '12px', background: '#3b82f6', fontWeight: 'bold', color: 'white'}} onClick={processPrintAndSave}>✅ IN PHIẾU</button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="modal-title">CẤU HÌNH KHỔ GIẤY</div>
                                    <div style={{ marginBottom: '20px' }}>
                                        <div style={{ marginBottom: '12px' }}>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#475569' }}>Chiều Rộng (Width - mm)</label>
                                            <input 
                                                type="number" 
                                                value={printConfig.width}
                                                onChange={(e) => setPrintConfig({...printConfig, width: Number(e.target.value)})}
                                                className="note-input"
                                                style={{ fontSize: '16px' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#475569' }}>Chiều Cao (Height - mm)</label>
                                            <input 
                                                type="number" 
                                                value={printConfig.height}
                                                onChange={(e) => setPrintConfig({...printConfig, height: Number(e.target.value)})}
                                                className="note-input"
                                                style={{ fontSize: '16px' }}
                                            />
                                        </div>
                                        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px', fontStyle: 'italic' }}>
                                            * Hệ thống sẽ tự động lưu cấu hình này cho lần sau.
                                        </p>
                                    </div>
                                    <div style={{display: 'flex', gap: '12px'}}>
                                        <button style={{flex: 1, padding: '12px', border: 'none', borderRadius: '12px', background: '#f1f5f9', fontWeight: 'bold', color: '#64748b'}} onClick={() => setShowPrintConfig(false)}>Hủy</button>
                                        <button style={{flex: 1, padding: '12px', border: 'none', borderRadius: '12px', background: '#3b82f6', fontWeight: 'bold', color: 'white'}} onClick={savePrintConfig}>LƯU CẤU HÌNH</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* PASSWORD MODAL */}
                {showPasswordModal && (
                    <div id="password-modal" className="modal-overlay">
                        <div className="modal-box" style={{ maxWidth: '350px' }}>
                            <div className="modal-title">QUẢN TRỊ VIÊN</div>
                            <div style={{ padding: '20px 0' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input 
                                        type={showPasswordChars ? "text" : "password"}
                                        className="note-input" 
                                        style={{ fontSize: '16px', padding: '12px', flex: 1 }}
                                        placeholder="Nhập mật khẩu..." 
                                        value={passwordInput}
                                        onChange={(e) => setPasswordInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordSubmit(); }}
                                        autoFocus
                                    />
                                    <button 
                                        onClick={() => setShowPasswordChars(!showPasswordChars)}
                                        style={{
                                            width: '48px',
                                            background: '#f1f5f9',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '18px'
                                        }}
                                    >
                                        {showPasswordChars ? "🚫" : "👁️"}
                                    </button>
                                </div>
                                {passwordError && (
                                    <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '10px', fontWeight: '600', textAlign: 'center' }}>
                                        {passwordError}
                                    </div>
                                )}
                                {isLoading && !showStatsModal && (
                                    <div style={{ fontSize: '12px', marginTop: '10px', color: '#64748b', textAlign: 'center' }}>Đang kết nối...</div>
                                )}
                            </div>
                            <div style={{display: 'flex', gap: '12px'}}>
                                <button style={{flex: 1, padding: '12px', border: 'none', borderRadius: '12px', background: '#f1f5f9', fontWeight: 'bold', color: '#64748b'}} onClick={() => setShowPasswordModal(false)}>Đóng</button>
                                <button style={{flex: 1, padding: '12px', border: 'none', borderRadius: '12px', background: '#3b82f6', fontWeight: 'bold', color: 'white'}} onClick={handlePasswordSubmit}>XÁC NHẬN</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* STATS MODAL */}
                {showStatsModal && (
                    <div id="stats-modal" className="modal-overlay">
                        <div className="modal-box">
                            <div className="modal-title" style={{color: '#1e293b'}}>THỐNG KÊ DOANH THU</div>
                            {isLoading && <div id="loading" style={{ display: 'block' }}>Đang tải dữ liệu...</div>}
                            {!isLoading && (
                                <div id="stats-content">
                                    <div className="tabs-container" style={{display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', marginBottom: '20px'}}>
                                        {['today', 'month', 'year', 'custom'].map(t => (
                                            <button 
                                                key={t}
                                                style={{flex: 1, padding: '10px 0', border: 'none', background: currentTab === t ? 'white' : 'transparent', borderRadius: '10px', fontWeight: '600', color: currentTab === t ? '#3b82f6' : '#64748b', boxShadow: currentTab === t ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'}}
                                                onClick={() => setCurrentTab(t)}
                                            >
                                                {t === 'today' ? 'HÔM NAY' : t === 'month' ? 'THÁNG' : t === 'year' ? 'NĂM' : 'KHÁC'}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="stat-display-area" style={{textAlign: 'center', paddingBottom: '10px'}}>
                                        <div style={{ fontSize: '36px', fontWeight: '900', color: statsDisplay.color, marginBottom: '5px' }}>{statsDisplay.value}</div>
                                        <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>{statsDisplay.label}</div>
                                        {currentTab === 'custom' && (
                                            <div id="date-picker-area" style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                                                <input type="date" className="date-input" style={{flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1'}} onChange={(e) => setCustomDate(e.target.value)} />
                                                <button style={{padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold'}} onClick={lookupDate}>Xem</button>
                                            </div>
                                        )}
                                        <div style={{ marginTop: '20px', padding: '10px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px' }}>Tổng số đơn đã in: <b style={{ color: '#1e293b' }}>{stats.count}</b></div>
                                    </div>
                                </div>
                            )}
                            <div style={{marginTop: 'auto'}}>
                                <button style={{width: '100%', padding: '14px', border: 'none', borderRadius: '14px', background: '#f1f5f9', fontWeight: 'bold', color: '#64748b'}} onClick={() => setShowStatsModal(false)}>Đóng</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* TOAST */}
                <div id="toast" className={toastMessage ? 'show' : ''}>{toastMessage}</div>
            </div>

            {/* PRINT SECTION (Moved outside ui-container) */}
            <div id="print-section"></div>
        </React.Fragment>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);