#nullable enable

using Community.VisualStudio.Toolkit;
using System.Threading.Tasks;

namespace GitWebLinks;

public class Logger : ILogger {

    private readonly OutputWindowPane _pane;


    public static async Task<Logger> CreateAsync() {
        return new Logger(await VS.Windows.CreateOutputWindowPaneAsync("GitWebLinks"));
    }


    private Logger(OutputWindowPane pane) {
        _pane = pane;
    }


    public async Task LogAsync(string message) {
        await _pane.WriteLineAsync(message);
    }

}
