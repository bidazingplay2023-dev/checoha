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
    isNoteOpen: boolean; // Trạng thái hiển thị ô ghi chú (giống logic display:block cũ)
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
    const [showPasswordModal, setShowPasswordModal] = useState(false); // Modal mật khẩu mới
    const [passwordInput, setPasswordInput] = useState(""); // Input mật khẩu mới
    const [showPasswordChars, setShowPasswordChars] = useState(false); // Trạng thái ẩn/hiện mật khẩu
    const [passwordError, setPasswordError] = useState(""); // Thông báo lỗi mật khẩu
    const [toastMessage, setToastMessage] = useState("");
    
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

    // Effect for Stats Display
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
            // Tìm món trùng tên và KHÔNG có ghi chú (giống logic cũ)
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

    // Hàm mới: Xử lý nhập số trực tiếp vào input
    const handleDirectQtyChange = (index: number, valStr: string) => {
        // Cho phép nhập rỗng (để user xóa số cũ)
        if (valStr === "") {
            setCart(prev => {
                const newCart = [...prev];
                // Tạm thời gán bằng 0 hoặc giữ nguyên hiển thị rỗng bằng cách ép kiểu (cần cẩn thận logic render)
                // Ở đây ta cứ set tạm, onBlur sẽ xử lý
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

    // Hàm mới: Xử lý khi input số bị mất focus (onBlur)
    const handleQtyBlur = (index: number) => {
        setCart(prev => {
            const newCart = [...prev];
            // Nếu để trống hoặc <= 0 mà không phải do bấm nút xóa, ta reset về 1
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
                // LOGIC TÁCH DÒNG (Giống code cũ)
                // 1. Giảm số lượng món hiện tại đi 1
                // 2. Tạo món mới ngay bên dưới với số lượng 1 và BẬT ghi chú
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
                
                // Focus vào ô input của món MỚI (index + 1)
                setTimeout(() => {
                    const nextInput = noteInputsRef.current[index + 1];
                    if (nextInput) nextInput.focus();
                }, 50);
            } else {
                 // Số lượng = 1, chỉ đơn giản là hiện input
                 setCart(prev => {
                    const newCart = [...prev];
                    newCart[index].isNoteOpen = true;
                    return newCart;
                 });
                 
                 // Focus vào ô input hiện tại
                 setTimeout(() => {
                    const input = noteInputsRef.current[index];
                    if (input) input.focus();
                 }, 50);
            }
        } else {
            // Bỏ tích -> Ẩn input và xóa nội dung note
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

    const processPrintAndSave = () => {
        let totalMoney = 0;
        cart.forEach(i => totalMoney += (i.price * (Number(i.quantity) || 0)));
        setShowConfirmModal(false);

        // Inject into DOM for printing
        const printSection = document.getElementById('print-section');
        if (printSection) {
            // 1. Quan trọng: Reset sạch nội dung cũ để tránh lỗi trên Safari
            printSection.innerHTML = '';
            
            // Generate Print HTML String
            let printHTML = '';
            cart.forEach(item => {
                const notePart = (item.note && item.note.trim() !== "") 
                    ? `<span class="sticker-custom-note">${item.note}</span>` 
                    : '';
                const qty = Number(item.quantity) || 0;
                for (let q = 0; q < qty; q++) {
                    printHTML += `<div class="sticker"><span class="sticker-name">${item.name}</span>${notePart}</div>`;
                }
            });

            // 2. Gán nội dung mới
            printSection.innerHTML = printHTML;
            
            // 3. Tăng thời gian chờ một chút để DOM kịp render trên iPhone
            setTimeout(() => {
                window.print();
                
                // 4. Kiểm tra xác nhận SAU khi cửa sổ in đóng lại (hoặc user hủy)
                setTimeout(() => {
                    const isPrinted = window.confirm("🖨️ XÁC NHẬN:\n\nBạn đã in phiếu thành công chưa?\n\n- Bấm [OK] để LƯU DOANH THU & XÓA ĐƠN.\n- Bấm [Cancel] nếu bạn hủy in.");
                    
                    if (isPrinted) {
                        sendToGoogleSheet(totalMoney);
                        clearCart();
                    }
                    
                    // QUAN TRỌNG: Luôn dọn dẹp vùng in sau khi hoàn tất quy trình (dù in hay hủy)
                    // để Safari không bị "kẹt" nội dung ở lần in sau.
                    if (printSection) printSection.innerHTML = ''; 
                    
                }, 500);
            }, 500);
        }
    };

    // --- STATS ---

    // Hàm mở modal nhập mật khẩu
    const handleAskPassword = () => {
        setPasswordInput(""); // Reset input
        setShowPasswordChars(false); // Reset chế độ hiện mật khẩu
        setPasswordError(""); // Reset lỗi
        setShowPasswordModal(true);
    };

    // Hàm xử lý sau khi nhập mật khẩu và bấm Xem
    const handlePasswordSubmit = () => {
        setPasswordError(""); // Xóa lỗi cũ
        
        if (!passwordInput.trim()) {
            setPasswordError("Vui lòng nhập mật khẩu!");
            return;
        }

        const pass = passwordInput;
        
        // Không đóng modal ngay, chờ kết quả kiểm tra
        setIsLoading(true); 
        
        // Gọi API lấy thống kê
        fetch(GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'get_stats', password: pass })
        })
        .then(response => response.json())
        .then(result => {
            setIsLoading(false);
            if (result.result === "success") {
                // Mật khẩu đúng
                setShowPasswordModal(false); // Đóng modal mật khẩu
                setGlobalPassword(pass); // Lưu mật khẩu
                setStats(result);
                setCurrentTab('today');
                setShowStatsModal(true); // Mở modal thống kê
            } else {
                // Mật khẩu sai
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
                        placeholder="🔍 Tìm nhanh (gõ tên món)..." 
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
                        <div style={{ height: '20px' }}></div>
                    </div>

                    {/* RIGHT PANEL */}
                    <div id="right-panel">
                        <div id="cart-container">
                            <div id="cart-header">
                                <span><span style={{ fontSize: '16px' }}>🛒</span> Đơn đang chọn</span>
                                <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' }}>
                                    SL: <b id="count-display">{cartCount}</b>
                                </span>
                            </div>
                            <div id="cart-list" ref={cartListRef}>
                                {cart.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '15px', color: '#aaa', fontSize: '12px', fontStyle: 'italic' }}>
                                        Chưa chọn món nào<br />Hãy bấm vào menu ở trên
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
                                                        {/* COMPACT QTY GROUP */}
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
                                                        <div className="delete-btn" onClick={() => removeLine(i)}>✕</div>
                                                    </div>
                                                </div>
                                                <div className="option-row">
                                                    <label style={{ display: 'flex', alignItems: 'center', width: '100%', cursor: 'pointer' }}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={item.isNoteOpen} 
                                                            onChange={(e) => toggleNote(i, e.target.checked)}
                                                            style={{ marginRight: '5px' }} 
                                                        /> Ghi chú
                                                    </label>
                                                </div>
                                                {item.isNoteOpen && (
                                                    <div style={{ display: 'block' }}>
                                                        <input 
                                                            type="text" 
                                                            className="note-input" 
                                                            placeholder="Nhập ghi chú..." 
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
                                <span>TỔNG TIỀN:</span>
                                <span id="total-price" style={{ fontSize: '20px' }}>{formatK(cartTotal)}</span>
                            </div>
                            <div className="action-row">
                                <button id="btn-print" className="action-btn" onClick={() => cart.length > 0 ? setShowConfirmModal(true) : alert("Chưa chọn món nào!")}>
                                    🖨️ IN & LƯU
                                </button>
                            </div>
                            <div className="action-row" style={{ marginTop: '6px' }}>
                                <button id="btn-clear" className="action-btn" onClick={clearCart}>🗑️ Xóa mới</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CONFIRM MODAL */}
                {showConfirmModal && (
                    <div id="confirm-modal" className="modal-overlay">
                        <div className="modal-box">
                            <div className="modal-title">XÁC NHẬN ĐƠN HÀNG</div>
                            <div className="confirm-list">
                                {cart.map((item, idx) => (
                                    <div className="confirm-row" key={idx}>
                                        <div style={{ flex: 1 }}>
                                            <b>x{item.quantity}</b> {item.name} 
                                            {item.note && <><br /><small style={{ color: 'red', fontStyle: 'italic' }}>({item.note})</small></>}
                                        </div>
                                        <div style={{ fontWeight: 'bold' }}>{formatK(item.price * (Number(item.quantity) || 0))}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="confirm-total">Tổng: {formatK(cartTotal)}</div>
                            <div className="modal-btn-group">
                                <button className="modal-btn btn-cancel" onClick={() => setShowConfirmModal(false)}>Sửa lại</button>
                                <button className="modal-btn btn-confirm" onClick={processPrintAndSave}>✅ IN NGAY</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* PASSWORD MODAL (MỚI: Thêm Ẩn/Hiện và Báo lỗi) */}
                {showPasswordModal && (
                    <div id="password-modal" className="modal-overlay">
                        <div className="modal-box" style={{ maxWidth: '350px' }}>
                            <div className="modal-title">NHẬP MẬT KHẨU QUẢN LÝ</div>
                            <div style={{ padding: '20px 0' }}>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <input 
                                        type={showPasswordChars ? "text" : "password"}
                                        className="note-input" 
                                        style={{ fontSize: '16px', padding: '10px', flex: 1 }}
                                        placeholder="Nhập mật khẩu..." 
                                        value={passwordInput}
                                        onChange={(e) => setPasswordInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordSubmit(); }}
                                        autoFocus
                                    />
                                    <button 
                                        onClick={() => setShowPasswordChars(!showPasswordChars)}
                                        style={{
                                            width: '40px',
                                            background: '#eee',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '18px'
                                        }}
                                        title={showPasswordChars ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                    >
                                        {showPasswordChars ? "🚫" : "👁️"}
                                    </button>
                                </div>
                                {passwordError && (
                                    <div style={{ 
                                        color: '#d32f2f', 
                                        fontSize: '13px', 
                                        marginTop: '8px', 
                                        fontStyle: 'italic',
                                        fontWeight: 'bold'
                                    }}>
                                        ⚠️ {passwordError}
                                    </div>
                                )}
                                {isLoading && !showStatsModal && (
                                    <div style={{ fontSize: '12px', marginTop: '8px', color: '#666', textAlign: 'center' }}>Đang kiểm tra...</div>
                                )}
                            </div>
                            <div className="modal-btn-group">
                                <button className="modal-btn btn-cancel" onClick={() => setShowPasswordModal(false)}>Hủy</button>
                                <button className="modal-btn btn-confirm" onClick={handlePasswordSubmit}>XEM</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* STATS MODAL */}
                {showStatsModal && (
                    <div id="stats-modal" className="modal-overlay">
                        <div className="modal-box">
                            <div className="modal-title">DOANH THU</div>
                            {isLoading && <div id="loading" style={{ display: 'block' }}>Đang tải dữ liệu...</div>}
                            {!isLoading && (
                                <div id="stats-content">
                                    <div className="tabs-container">
                                        <button className={`tab-btn ${currentTab === 'today' ? 'active' : ''}`} onClick={() => setCurrentTab('today')}>HÔM NAY</button>
                                        <button className={`tab-btn ${currentTab === 'month' ? 'active' : ''}`} onClick={() => setCurrentTab('month')}>THÁNG</button>
                                        <button className={`tab-btn ${currentTab === 'year' ? 'active' : ''}`} onClick={() => setCurrentTab('year')}>NĂM</button>
                                        <button className={`tab-btn ${currentTab === 'custom' ? 'active' : ''}`} onClick={() => setCurrentTab('custom')}>KHÁC</button>
                                    </div>
                                    <div className="stat-display-area">
                                        <div className="stat-big-value" style={{ color: statsDisplay.color }}>{statsDisplay.value}</div>
                                        <div className="stat-label">{statsDisplay.label}</div>
                                        {currentTab === 'custom' && (
                                            <div id="date-picker-area" style={{ display: 'flex' }}>
                                                <input type="date" className="date-input" onChange={(e) => setCustomDate(e.target.value)} />
                                                <button className="btn-search-date" onClick={lookupDate}>🔍 Tra cứu</button>
                                            </div>
                                        )}
                                        <div className="stat-count-info">Tổng đơn đã in: <b style={{ color: '#333' }}>{stats.count}</b></div>
                                    </div>
                                </div>
                            )}
                            <div className="modal-btn-group">
                                <button className="modal-btn btn-cancel" onClick={() => setShowStatsModal(false)}>Đóng</button>
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