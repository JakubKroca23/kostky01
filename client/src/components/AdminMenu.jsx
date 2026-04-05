import React from 'react';

function AdminMenu({ maintenanceMode, onToggleMaintenance, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="admin-modal glass neon-card">
        <div className="modal-header">
           <h2 className="neon-text-cyan">ADMIN PANEL</h2>
           <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="admin-content">
           <div className="admin-action-row">
              <div className="action-info">
                 <h3>Režim údržby</h3>
                 <p>Pokud zapnete, všichni kromě vás budou vykázáni do údržbové obrazovky.</p>
              </div>
              <div className={`admin-toggle ${maintenanceMode ? 'active' : ''}`} 
                   onClick={() => onToggleMaintenance(!maintenanceMode)}>
                 <div className="toggle-handle"></div>
              </div>
           </div>
           
           <div className="admin-status-info">
              Stav: {maintenanceMode ? <span className="status-danger">AKTIVNÍ</span> : <span className="status-success">VYPNUTO</span>}
           </div>
        </div>
        
        <div className="admin-footer">
           <p>Uživatel: zakladatel (Vlastník)</p>
        </div>
      </div>
    </div>
  );
}

export default AdminMenu;
