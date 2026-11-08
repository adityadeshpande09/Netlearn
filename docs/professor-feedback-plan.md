# Professor-feedback implementation plan

Focus on diagnosis of prepared networks, guided packet explanations, and visual
subnet partitioning. Keep Vercel and the current stack; no AWS migration.
Each unit needs a separate review and owner approval before staging/committing.

1. **Retire the public builder.** Remove navigation and promotional links;
   permanently redirect `/playground` to `/labs/troubleshooting`. Emphasize labs
   without replacing the visual identity. Preserve saved browser data. Keep
   internal builder modules temporarily for extraction in unit 2. Retire only
   obsolete builder browser tests; retain domain/storage tests and move shared
   inspector tests to the remaining routes. React Flow remains required.
   Proposed commit: `Focus NetLearn on troubleshooting`.
2. **Add a reusable investigation framework and first labs.** Define typed
   objectives, initial topology/configuration, fault, diagnostics, supported
   repairs, connectivity criteria, hints and explanations outside React. Reuse
   the simulator, terminal engine, route lookup, canvas and inspectors. Replace
   repair-choice quizzes with inspect → diagnose → configure → verify controls.
   Start with wrong mask and gateway cases, including local versus remote ping;
   then add static-route diagnosis. Verify return paths and show configuration
   changes. Extract useful terminal/editor modules before deleting builder-only
   code. Proposed commits: `Add hands-on troubleshooting labs`, then
   `Add static route diagnosis`.
3. **Add VLAN, trunk and interface-state labs.** Current types do not model these
   behaviors. Add explicit domain semantics and ARP/forwarding tests before any
   UI or state-derived `show` commands. No full IOS emulator or canned outputs.
   Proposed commits: `Model VLAN forwarding for labs`, then
   `Add switch troubleshooting labs`.
4. **Animate subnet partitioning.** Reuse `splitSubnet`, including its bounded
   16-result pagination. Keep the parent network while selecting a child; show
   borrowed bits, boundaries, ranges and counts with /31 and /32 caveats. Animate
   actual divisions with reduced-motion support; group large spaces. Preserve
   the calculator. Proposed commit: `Visualize subnet splitting`.
5. **Guide Packet Journey.** Add a pure event-to-learning-segment mapping without
   rewriting the engine. Separate simulation, guided segments, animation state
   and controls. Use contextual inline explanations, slower playback, pauses at
   major decisions and Continue/Previous. Make headers/timeline secondary and
   add limited prediction checkpoints. Proposed commit:
   `Guide the packet journey step by step`.

Run format, lint, typecheck, unit tests, production build and applicable browser
tests for every unit. Cover keyboard, reduced motion, narrow screens and enlarged
text. Update teaching limits and sources as semantics change. Advertise only
working functionality. Earlier uncommitted echo-reply/sharing work was backed up
outside the repository before unit 1 and must remain separately reviewable.
