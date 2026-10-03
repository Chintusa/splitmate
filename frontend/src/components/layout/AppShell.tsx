import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AddExpenseModal from '../modals/AddExpenseModal';

export const AppShell: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased flex flex-col">
      {/* Sidebar (Desktop fixed + Mobile drawer) */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Top Header */}
      <Header
        onMenuToggle={() => setMobileMenuOpen(true)}
        onAddExpenseClick={() => setAddExpenseOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex-1 flex flex-col pt-16">
        <main className="w-full flex-1">
          <Outlet context={{ searchQuery, openAddExpense: () => setAddExpenseOpen(true) }} />
        </main>
      </div>

      {/* Universal Add Expense Modal */}
      <AddExpenseModal
        isOpen={addExpenseOpen}
        onClose={() => setAddExpenseOpen(false)}
      />
    </div>
  );
};

export default AppShell;
