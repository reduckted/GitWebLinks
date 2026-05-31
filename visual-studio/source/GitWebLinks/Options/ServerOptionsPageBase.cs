using Newtonsoft.Json;
using System.ComponentModel;
using System.Runtime.InteropServices;

namespace GitWebLinks;

[ComVisible(true)]
public abstract class ServerOptionsPageBase : OptionsPageBase {

    private List<ServerListItem> _servers = [];


    internal IReadOnlyList<StaticServer> GetServers() {
        return Servers.Select(
            (x) => new StaticServer(
                x.Http ?? "",
                string.IsNullOrEmpty(x.Ssh) ? null : x.Ssh,
                string.IsNullOrEmpty(x.Web) ? null : x.Web
            )
        ).ToList();
    }


    [DesignerSerializationVisibility(DesignerSerializationVisibility.Hidden)]
    public List<ServerListItem> Servers {
        get => _servers;
        set {
            SetProperty(ref _servers, value ?? []);
            OnPropertyChanged(nameof(JsonServers));
        }
    }


    [DefaultValue("[]")]
    public string JsonServers {
        get => SerializeServers(Servers);
        set => Servers = DeserializeServers(value);
    }


    protected static string SerializeServers(IEnumerable<ServerListItem> servers) {
        return JsonConvert.SerializeObject(
            servers.Select((x) => new ServerListItem {
                Http = x.Http ?? "",
                Ssh = x.Ssh,
                Web = x.Web
            })
        );
    }


    protected static List<ServerListItem> DeserializeServers(string? data) {
        if ((data is null) || (data.Length == 0)) {
            return [];
        } else {
            return JsonConvert.DeserializeObject<IEnumerable<ServerListItem>>(data).ToList();
        }
    }

}
