mod commands;
mod db;
mod error;
mod models;

use db::Database;
use std::sync::Arc;
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

/// Application state shared across commands
pub struct AppState {
    pub db: Database,
}

fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    // Create tray menu
    let quit = MenuItem::with_id(app, "quit", "Quit Tangential", true, None::<&str>)?;
    let show = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;

    // Load tray icon from embedded bytes
    let icon =
        Image::from_bytes(include_bytes!("../icons/32x32.png")).expect("Failed to load tray icon");

    // Build tray icon
    let _tray = TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .tooltip("Tangential")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => {
                app.exit(0);
            }
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize database
            let db_path = db::get_database_path();
            let database = Database::new(db_path).expect("Failed to initialize database");

            // Store app state
            app.manage(Arc::new(AppState { db: database }));

            // Setup system tray
            setup_tray(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Projects
            commands::create_project,
            commands::get_project,
            commands::list_projects,
            commands::list_deleted_projects,
            commands::update_project,
            commands::delete_project,
            commands::restore_project,
            commands::permanently_delete_project,
            // Trees
            commands::create_tree,
            commands::get_tree,
            commands::list_trees,
            commands::list_staging_trees,
            commands::list_deleted_trees,
            commands::update_tree,
            commands::delete_tree,
            commands::restore_tree,
            commands::permanently_delete_tree,
            // Nodes
            commands::create_node,
            commands::get_node,
            commands::list_nodes,
            commands::get_root_nodes,
            commands::get_child_nodes,
            commands::get_node_path,
            commands::get_leaf_nodes,
            commands::update_node,
            commands::delete_node,
            commands::restore_node,
            commands::permanently_delete_node,
            // Settings
            commands::get_setting,
            commands::get_setting_value,
            commands::set_setting,
            commands::list_settings,
            commands::delete_setting,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
