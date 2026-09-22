use std::path::PathBuf;
use std::process::ExitCode;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;

use anyhow::{bail, Context, Result};
use zlynstall_core::{JobContext, JobEvent, Registry, Settings};

fn usage() -> ! {
    eprintln!(
        "usage: zlynstall-cli <command> [--json] [args]\n\n  inspect <file>            show what a .deb / .rpm / .AppImage contains\n  plan <file>               show how it would be installed on this host\n  pkgbuild <file>           print the PKGBUILD that would be generated (Arch)\n  install <file> [flags]    install it   (--no-menu, --desktop, --keep, --remove-original)\n  list                      what ZLynstall installed\n  uninstall <id|slug>       remove it again\n  repair <id|slug>          re-create its shortcuts\n  launch <id|slug>          start it\n  system                    show detected distro and tools"
    );
    std::process::exit(2)
}

fn main() -> ExitCode {
    unsafe {
        libc::signal(libc::SIGPIPE, libc::SIG_DFL);
    }
    let rt = tokio::runtime::Runtime::new().expect("tokio runtime");
    match rt.block_on(run()) {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("error: {e:#}");
            ExitCode::FAILURE
        }
    }
}

fn resolve_id(registry: &Registry, key: &str) -> Result<String> {
    registry
        .find(key)
        .or_else(|| registry.find_by_slug(key))
        .map(|e| e.id.clone())
        .with_context(|| format!("nothing in the library matches {key}"))
}

fn print_event(ev: &JobEvent, verbose: bool) {
    match ev {
        JobEvent::Stage { index, status } => println!("[stage {index}] {status:?}"),
        JobEvent::Narrate { text } => println!("» {text}"),
        JobEvent::Log { line } => {
            if verbose {
                println!("    {line}");
            }
        }
        JobEvent::NeedsAuth => println!("» (password prompt)"),
        JobEvent::Done { entry } => println!(
            "✓ installed {} {} (id {})",
            entry.name, entry.version, entry.id
        ),
        JobEvent::Failed { message, hint } => {
            println!("✗ {message}");
            if let Some(h) = hint {
                println!("  hint: {h}");
            }
        }
    }
}

async fn run() -> Result<()> {
    let mut args: Vec<String> = std::env::args().skip(1).collect();
    let json = args.iter().any(|a| a == "--json");
    let verbose = args.iter().any(|a| a == "-v" || a == "--verbose");
    let flags: Vec<String> = args
        .iter()
        .filter(|a| a.starts_with("--") || *a == "-v")
        .cloned()
        .collect();
    args.retain(|a| !a.starts_with("--") && a != "-v");
    let Some(cmd) = args.first().cloned() else {
        usage()
    };

    match cmd.as_str() {
        "system" => {
            let info = zlynstall_core::detect_system();
            if json {
                println!("{}", serde_json::to_string_pretty(&info)?);
            } else {
                println!(
                    "{} ({}) · desktop {} · arch {}",
                    info.pretty_name,
                    info.family.label(),
                    info.desktop.as_deref().unwrap_or("-"),
                    info.arch
                );
                for t in &info.tools {
                    println!(
                        "  {:<24} {}",
                        t.name,
                        t.path
                            .as_ref()
                            .map(|p| p.display().to_string())
                            .unwrap_or_else(|| "missing".into())
                    );
                }
            }
        }
        "inspect" => {
            let path = PathBuf::from(args.get(1).cloned().unwrap_or_else(|| usage()));
            let model = zlynstall_core::inspect(&path)
                .with_context(|| format!("inspecting {}", path.display()))?;
            if json {
                println!("{}", serde_json::to_string_pretty(&model)?);
            } else {
                println!(
                    "{} — {} {} [{}] ({})",
                    model.kind.label(),
                    model.display_name,
                    model.version,
                    model.arch,
                    model.name
                );
                if let Some(s) = &model.summary {
                    println!("  {s}");
                }
                println!(
                    "  files: {}  top-level: {}",
                    model.file_count,
                    model.top_level_paths.join(", ")
                );
                println!(
                    "  desktop entries: {}  icon: {}",
                    model.desktop_entries.len(),
                    model
                        .icon_data_url
                        .as_ref()
                        .map(|u| format!("{} bytes", u.len()))
                        .unwrap_or_else(|| "none".into())
                );
                for d in &model.dependencies {
                    println!(
                        "  dep: {}{}",
                        d.name,
                        d.version_req
                            .as_ref()
                            .map(|v| format!(" ({v})"))
                            .unwrap_or_default()
                    );
                }
            }
        }
        "pkgbuild" => {
            let path = PathBuf::from(args.get(1).cloned().unwrap_or_else(|| usage()));
            let model = zlynstall_core::inspect(&path)
                .with_context(|| format!("inspecting {}", path.display()))?;
            let system = zlynstall_core::detect_system();
            let verifier = zlynstall_core::HostVerifier::new(system.family);
            let plan = zlynstall_core::plan(&model, &system, &verifier);
            let deps: Vec<String> = plan
                .dependencies
                .iter()
                .filter_map(|d| d.resolved.clone())
                .collect();
            let ext = model.kind.label().trim_start_matches('.').to_lowercase();
            print!(
                "{}",
                zlynstall_core::convert::pkgbuild::generate(
                    &model,
                    &model.name,
                    &deps,
                    &format!("source.{ext}")
                )
            );
        }
        "plan" => {
            let path = PathBuf::from(args.get(1).cloned().unwrap_or_else(|| usage()));
            let model = zlynstall_core::inspect(&path)
                .with_context(|| format!("inspecting {}", path.display()))?;
            let system = zlynstall_core::detect_system();
            let verifier = zlynstall_core::HostVerifier::new(system.family);
            let plan = zlynstall_core::plan(&model, &system, &verifier);
            if json {
                println!("{}", serde_json::to_string_pretty(&plan)?);
            } else {
                println!(
                    "{} {} on {} → {:?}",
                    model.display_name,
                    model.version,
                    system.family.label(),
                    plan.strategy
                );
                println!(
                    "  stages: {}",
                    plan.stages
                        .iter()
                        .map(|s| s.label.as_str())
                        .collect::<Vec<_>>()
                        .join(" → ")
                );
                println!(
                    "  needs root: {}  missing tools: {}",
                    plan.needs_root,
                    plan.missing_tools
                        .iter()
                        .map(|t| t.name.as_str())
                        .collect::<Vec<_>>()
                        .join(", ")
                );
                for d in &plan.dependencies {
                    println!(
                        "  {:<40} {:?} {}",
                        d.raw,
                        d.status,
                        d.resolved.as_deref().unwrap_or("-")
                    );
                }
                for w in &plan.warnings {
                    println!("  ! {w}");
                }
            }
        }
        "install" => {
            let path = PathBuf::from(args.get(1).cloned().unwrap_or_else(|| usage()));
            let model = zlynstall_core::inspect(&path)
                .with_context(|| format!("inspecting {}", path.display()))?;
            let system = zlynstall_core::detect_system();
            let settings = Settings::load();
            let verifier = zlynstall_core::HostVerifier::new(system.family);
            let plan = zlynstall_core::plan(&model, &system, &verifier);
            let is_appimage = matches!(plan.strategy, zlynstall_core::Strategy::AppImageIntegrate);
            let options = zlynstall_core::InstallOptions {
                menu_entry: !flags.iter().any(|f| f == "--no-menu"),
                desktop_shortcut: flags.iter().any(|f| f == "--desktop"),
                remove_original: if flags.iter().any(|f| f == "--keep") {
                    false
                } else if flags.iter().any(|f| f == "--remove-original") {
                    true
                } else if is_appimage {
                    settings.remove_original_appimage
                } else {
                    settings.remove_original_package
                },
            };
            let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
            let ctx = JobContext::new(
                plan,
                options,
                system,
                settings,
                tx,
                Arc::new(AtomicBool::new(false)),
            );
            let job = tokio::spawn(zlynstall_core::job::run(ctx));
            let mut failed = false;
            while let Some(ev) = rx.recv().await {
                if json {
                    println!("{}", serde_json::to_string(&ev)?);
                } else {
                    print_event(&ev, verbose);
                }
                failed |= matches!(ev, JobEvent::Failed { .. });
            }
            job.await?;
            if failed {
                bail!("install failed");
            }
        }
        "list" => {
            let registry = Registry::load();
            if json {
                println!("{}", serde_json::to_string_pretty(&registry.entries)?);
            } else if registry.entries.is_empty() {
                println!("nothing installed through ZLynstall yet");
            } else {
                for e in &registry.entries {
                    println!(
                        "{:<36} {:<24} {:<12} {:?} {}",
                        e.id,
                        e.name,
                        e.version,
                        e.install_kind,
                        e.appimage_path
                            .as_ref()
                            .map(|p| p.display().to_string())
                            .or(e.host_package.clone())
                            .unwrap_or_default()
                    );
                }
            }
        }
        "uninstall" | "repair" | "launch" => {
            let key = args.get(1).cloned().unwrap_or_else(|| usage());
            let registry = Registry::load();
            let id = resolve_id(&registry, &key)?;
            let system = zlynstall_core::detect_system();
            if cmd == "launch" {
                let entry = registry.find(&id).context("entry vanished")?;
                zlynstall_core::manage::launch(entry).map_err(|e| anyhow::anyhow!(e))?;
                println!("launched {}", entry.name);
                return Ok(());
            }
            let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
            let printer = tokio::spawn(async move {
                while let Some(ev) = rx.recv().await {
                    print_event(&ev, verbose);
                }
            });
            let result = if cmd == "uninstall" {
                zlynstall_core::manage::uninstall(&id, &system, &tx).await
            } else {
                zlynstall_core::manage::repair(&id, &system, &tx).await
            };
            drop(tx);
            printer.await?;
            result.map_err(|e| anyhow::anyhow!("{}", e.message))?;
        }
        other => bail!("unknown command {other}"),
    }
    Ok(())
}
