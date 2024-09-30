import User from "../models/user.model.js"; // Kullanıcı modelini içe aktar
import bcrypt from "bcryptjs"; // Şifreleme işlemi için bcryptjs kullanılıyor
import jwt from "jsonwebtoken"; // JWT (JSON Web Token) işlemleri için jsonwebtoken kullanılıyor
import dotenv from "dotenv"; // .env dosyasından ortam değişkenlerini yüklemek için dotenv kullanılıyor
import { sendWelcomeEmail } from "../emails/emailHandlers.js";

// .env dosyasını projeye yükle
dotenv.config();

// Kullanıcı kayıt fonksiyonu
export const signup = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    // Girdi doğrulama: Tüm alanlar dolu mu?
    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // E-posta zaten mevcut mu? Eğer mevcutsa hata döndür
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Kullanıcı adı zaten mevcut mu? Eğer mevcutsa hata döndür
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Şifrenin uzunluğunu kontrol et, eğer 6 karakterden kısaysa hata döndür
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    // Şifreleme işlemi: Salt üret ve şifreyi hash'le
    const salt = await bcrypt.genSalt(10); // Salt üretme (şifre güvenliğini artırmak için)
    const hashedPassword = await bcrypt.hash(password, salt); // Şifreyi salt ile hash'le

    // Yeni kullanıcı oluştur
    const user = new User({
      name,
      username,
      email,
      password: hashedPassword, // Hashlenmiş şifreyi kaydet
    });

    // Kullanıcıyı veritabanına kaydet
    await user.save();

    // Kullanıcıya ait JWT oluştur (JSON Web Token)
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "3d", // Token 3 gün boyunca geçerli olacak
    });

    // JWT'yi cookie'ye yerleştir
    res.cookie("token", token, {
      httpOnly: true, // Cookie'yi sadece sunucuya gönder (XSS ataklarına karşı)
      maxAge: 1000 * 60 * 60 * 24 * 3, // 3 gün boyunca geçerli
      sameSite: "strict", // Cookie sadece aynı siteden gelen isteklerle gönderilir
      secure: process.env.NODE_ENV === "production", // Yalnızca HTTPS üzerinden gönder
    });

    // Kullanıcı başarılı bir şekilde kaydedildiğinde 201 yanıtı gönder
    res.status(201).json({ message: "User registered successfully" });

    const profileUrl = process.env.FRONTEND_URL + "/profile/" + user.username;

    try {
      await sendWelcomeEmail(user.email, user.name, profileUrl);
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError);
    }
  } catch (error) {
    // Hata durumunda hata mesajını konsola yazdır ve 500 yanıtı gönder
    console.error("Error in signup:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Giriş fonksiyonu
export const login = (req, res) => {
  res.send("login");
};

// Çıkış fonksiyonu
export const logout = (req, res) => {
  res.send("logout");
};
