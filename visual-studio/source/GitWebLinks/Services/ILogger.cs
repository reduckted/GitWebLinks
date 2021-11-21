#nullable enable

using System.Threading.Tasks;

namespace GitWebLinks;

public interface ILogger {

    Task LogAsync(string message);

}
