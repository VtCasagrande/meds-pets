'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import UserMenu from './UserMenu';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Fechar menu quando o caminho muda
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);
  
  const isActive = (path: string) => {
    return pathname === path;
  };
  
  return (
    <nav className="bg-white shadow-md border-b border-gray-200">
      <div className="container mx-auto py-4 px-4 md:px-6">
        <div className="flex justify-between items-center">
          {/* Logo e nome */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white">
              <span className="text-xl font-bold">🐾</span>
            </div>
            <span className="text-xl font-semibold text-gray-800">MedsPets</span>
          </Link>
          
          {/* Menu para desktop */}
          <div className="hidden md:flex items-center space-x-1">
            <NavLink href="/" active={isActive('/')}>
              Início
            </NavLink>
            <NavLink href="/reminders" active={isActive('/reminders')}>
              Lembretes
            </NavLink>
            <NavLink href="/reminders/new" active={isActive('/reminders/new')}>
              Novo Lembrete
            </NavLink>
            <NavLink href="/webhook" active={isActive('/webhook')}>
              Webhooks
            </NavLink>
            <NavLink href="/webhook-logs" active={isActive('/webhook-logs')}>
              Logs
            </NavLink>
          </div>
          
          {/* Área de usuário - Desktop */}
          <div className="hidden md:flex items-center">
            <UserMenu />
          </div>
          
          {/* Botão do menu mobile */}
          <button 
            className="md:hidden flex items-center text-gray-800"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
              )}
            </svg>
          </button>
        </div>
        
        {/* Menu mobile */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-2 space-y-2">
            <MobileNavLink href="/" active={isActive('/')}>
              Início
            </MobileNavLink>
            <MobileNavLink href="/reminders" active={isActive('/reminders')}>
              Lembretes
            </MobileNavLink>
            <MobileNavLink href="/reminders/new" active={isActive('/reminders/new')}>
              Novo Lembrete
            </MobileNavLink>
            <MobileNavLink href="/webhook" active={isActive('/webhook')}>
              Webhooks
            </MobileNavLink>
            <MobileNavLink href="/webhook-logs" active={isActive('/webhook-logs')}>
              Logs
            </MobileNavLink>
            
            {/* Menu de usuário no mobile */}
            <div className="border-t border-gray-200 my-3 pt-3 px-3">
              <UserMenu />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      className={`px-3 py-2 rounded-lg text-sm font-medium ${
        active 
          ? 'bg-blue-500 text-white'
          : 'text-gray-800 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      className={`block px-3 py-2 rounded-lg text-base font-medium ${
        active 
          ? 'bg-blue-500 text-white'
          : 'text-gray-800 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  );
} 