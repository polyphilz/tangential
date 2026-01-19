# Development Notes

## Package Manager
Use `pnpm` instead of `npm` for all frontend-related commands.

## Frontend (React/TypeScript)
After making changes to frontend code in `src/`:
```bash
pnpm lint:fix    # Auto-fix lint issues
pnpm format      # Format code with Prettier
pnpm build       # Typecheck and build (catches TS errors)
```

## Rust (Tauri backend)
After making changes to Rust code in `src-tauri/`:
```bash
cd src-tauri
cargo fmt        # Format code
cargo clippy     # Lint - fix any warnings before committing
cargo build      # Compile and check for errors
```

To run the full app in development:
```bash
pnpm tauri dev
```
