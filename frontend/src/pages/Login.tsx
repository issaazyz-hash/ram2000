import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Lock, Mail, Phone, MapPin, Loader2 } from "lucide-react";
import { getApiBaseUrl } from "@/utils/apiConfig";

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle error response - ensure error is always a string
        let errorMessage = 'Échec de la connexion';
        if (data.error) {
          if (typeof data.error === 'string') {
            errorMessage = data.error;
          } else if (typeof data.error === 'object' && data.error.message) {
            errorMessage = data.error.message;
          } else {
            errorMessage = JSON.stringify(data.error);
          }
        } else if (data.message) {
          errorMessage = data.message;
        }
        setError(errorMessage);
        return;
      }
      
      if (data.success && data.data) {
        localStorage.setItem('user', JSON.stringify(data.data));
        setSuccess(`Connexion réussie! Bienvenue ${data.data.name} 🎉`);
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('userLogin'));
        
        // الانتقال للصفحة الرئيسية بعد 2 ثانية
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        // Ensure error is always a string
        let errorMessage = 'Échec de la connexion';
        if (data.error) {
          if (typeof data.error === 'string') {
            errorMessage = data.error;
          } else if (typeof data.error === 'object' && data.error.message) {
            errorMessage = data.error.message;
          }
        }
        setError(errorMessage);
      }
    } catch (err) {
      // Ensure error message is always a string
      const errorMessage = err instanceof Error ? err.message : 'Erreur de connexion au serveur. Vérifiez que le Backend est démarré';
      setError(errorMessage);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, phone, address }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Inscription réussie! Vous pouvez maintenant vous connecter 🎉');
        
        // الانتقال لنموذج تسجيل الدخول بعد 2 ثانية
        setTimeout(() => {
          setIsLogin(true);
          setEmail(email);
          setPassword("");
          setName("");
          setPhone("");
          setAddress("");
          setSuccess("");
        }, 2000);
      } else {
        setError(data.error || 'Échec de l\'inscription');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur. Vérifiez que le Backend est démarré');
      console.error('Register error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" 
         style={{ 
           background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
         }}>
      
      {/* Decorative clouds */}
      <div className="absolute top-0 left-0 w-full h-32 opacity-20">
        <svg viewBox="0 0 1200 200" className="w-full h-full">
          <path fill="#f97316" d="M0,100 Q200,50 400,100 T800,100 T1200,100 L1200,0 L0,0 Z" />
        </svg>
      </div>

      {/* Login/Register Card */}
      <div className="relative z-10 w-full max-w-md bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 sm:p-12 border border-orange-500/20"
           style={{
             boxShadow: '20px 20px 60px #000000, -20px -20px 60px #3d3d3d'
           }}>
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-orange-500 tracking-wider">
            {isLogin ? 'CONNEXION' : 'INSCRIPTION'}
          </h1>
        </div>

        {/* Toggle Buttons */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              setIsLogin(true);
              setError("");
              setSuccess("");
            }}
            className={`flex-1 py-2 rounded-xl font-semibold transition-all ${
              isLogin 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            Connexion
          </button>
          <button
            onClick={() => {
              setIsLogin(false);
              setError("");
              setSuccess("");
            }}
            className={`flex-1 py-2 rounded-xl font-semibold transition-all ${
              !isLogin 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            Inscription
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-3 rounded-2xl text-sm mb-6 text-center animate-pulse">
            ✅ {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-2xl text-sm mb-6 text-center">
            ❌ {error}
          </div>
        )}

        {/* Login Form */}
        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* Email Field */}
            <div className="relative">
              <div className="flex items-center bg-gray-800 rounded-2xl px-4 py-3 border border-orange-500/30"
                   style={{
                     boxShadow: 'inset 8px 8px 16px #000000, inset -8px -8px 16px #2d2d2d'
                   }}>
                <Mail className="w-5 h-5 text-orange-500 mr-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none"
                  placeholder="Email"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="relative">
              <div className="flex items-center bg-gray-800 rounded-2xl px-4 py-3 border border-orange-500/30"
                   style={{
                     boxShadow: 'inset 8px 8px 16px #000000, inset -8px -8px 16px #2d2d2d'
                   }}>
                <Lock className="w-5 h-5 text-orange-500 mr-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none"
                  placeholder="Mot de passe"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-white font-bold py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{
                boxShadow: '8px 8px 16px #000000, -8px -8px 16px #3d3d3d'
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                'SE CONNECTER'
              )}
            </button>
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegister} className="space-y-4">
            
            {/* Name Field */}
            <div className="relative">
              <div className="flex items-center bg-gray-800 rounded-2xl px-4 py-3 border border-orange-500/30"
                   style={{
                     boxShadow: 'inset 8px 8px 16px #000000, inset -8px -8px 16px #2d2d2d'
                   }}>
                <User className="w-5 h-5 text-orange-500 mr-3" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none"
                  placeholder="Nom complet"
                  required
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="relative">
              <div className="flex items-center bg-gray-800 rounded-2xl px-4 py-3 border border-orange-500/30"
                   style={{
                     boxShadow: 'inset 8px 8px 16px #000000, inset -8px -8px 16px #2d2d2d'
                   }}>
                <Mail className="w-5 h-5 text-orange-500 mr-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none"
                  placeholder="Email"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="relative">
              <div className="flex items-center bg-gray-800 rounded-2xl px-4 py-3 border border-orange-500/30"
                   style={{
                     boxShadow: 'inset 8px 8px 16px #000000, inset -8px -8px 16px #2d2d2d'
                   }}>
                <Lock className="w-5 h-5 text-orange-500 mr-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none"
                  placeholder="Mot de passe (min. 6 caractères)"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {/* Phone Field */}
            <div className="relative">
              <div className="flex items-center bg-gray-800 rounded-2xl px-4 py-3 border border-orange-500/30"
                   style={{
                     boxShadow: 'inset 8px 8px 16px #000000, inset -8px -8px 16px #2d2d2d'
                   }}>
                <Phone className="w-5 h-5 text-orange-500 mr-3" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none"
                  placeholder="Téléphone (optionnel)"
                />
              </div>
            </div>

            {/* Address Field */}
            <div className="relative">
              <div className="flex items-center bg-gray-800 rounded-2xl px-4 py-3 border border-orange-500/30"
                   style={{
                     boxShadow: 'inset 8px 8px 16px #000000, inset -8px -8px 16px #2d2d2d'
                   }}>
                <MapPin className="w-5 h-5 text-orange-500 mr-3" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none"
                  placeholder="Adresse (optionnel)"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-white font-bold py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{
                boxShadow: '8px 8px 16px #000000, -8px -8px 16px #3d3d3d'
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Création en cours...
                </>
              ) : (
                'CRÉER UN COMPTE'
              )}
            </button>
          </form>
        )}

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-gray-400 hover:text-orange-500 transition-colors">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;